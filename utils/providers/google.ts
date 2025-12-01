// utils/providers/google.ts

import {
  ProviderService,
  CompletionResult,
  registerProviderService,
  ModelSettings,
} from '../providerService';
import { approxTokensFromText } from '../tokens';

// Parse Server-Sent Events (SSE) from Google Gemini streamGenerateContent
async function* streamGoogleResponse(
  response: Response
): AsyncGenerator<any, void, unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  // Inactivity watchdog to avoid hanging if the server never closes the stream
  const IDLE_TIMEOUT_MS = 30000; // 30s without data
  while (true) {
    // Race the read against an inactivity timeout
    let timeoutId: any;
    const readPromise = reader.read();
    const timeoutPromise = new Promise<{ done: boolean; value?: Uint8Array }>((resolve) => {
      timeoutId = setTimeout(() => resolve({ done: true }), IDLE_TIMEOUT_MS);
    });
    const { done, value } = await Promise.race([readPromise, timeoutPromise]);
    clearTimeout(timeoutId);
    if (done) {
      try { await reader.cancel('idle-timeout-or-eos'); } catch {}
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    // Split on double newlines with optional CRs
    const parts = buffer.split(/\r?\n\r?\n/);
    buffer = parts.pop() || '';
    for (const part of parts) {
      // Collect all data: lines for this event
      const dataLines: string[] = [];
      for (const rawLine of part.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line) continue;
        if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trim());
        }
      }
      if (dataLines.length === 0) continue;
      const dataJoined = dataLines.join('\n');
      if (!dataJoined || dataJoined === '[DONE]') continue;
      try {
        yield JSON.parse(dataJoined);
      } catch {
        // ignore malformed chunk
      }
    }
  }
}

const googleService: ProviderService = {
  providerId: 'google',

  async getModels(apiKey: string): Promise<string[]> {
    // Models are hardcoded for now, as fetching them can be complex.
    return [
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro-latest',
      'gemini-1.0-pro',
    ];
  },

  async *generate(
    prompt: string,
    model: string,
    apiKey: string,
    signal?: AbortSignal,
    settings?: ModelSettings
  ): AsyncGenerator<CompletionResult> {
    const startTime = Date.now();
    let firstTokenTime: number | undefined;
    let tokenCount = 0; // approximate generated tokens
    let usageCandidates = 0; // server-reported output tokens
    let usagePrompt = 0; // server-reported input tokens
    let usageTotal = 0; // server-reported total tokens
    let generatedText = '';
    const promptApprox = Math.ceil((prompt || '').length / 4);

    // Use alt=sse and send API key via header per docs
    // Gemini expects the path segment to include the 'models/' prefix
    const modelPath = model.startsWith('models/') ? model : `models/${model}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:streamGenerateContent?alt=sse`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: settings?.temperature ?? 0.7,
          maxOutputTokens: settings?.maxTokens ?? 2048,
          topP: settings?.topP ?? 1.0,
        },
      }),
      signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Google API error: ${response.status} ${errorBody}`);
    }

    for await (const chunk of streamGoogleResponse(response)) {
      // Capture usage if present on any event
      const usage = chunk.usageMetadata;
      if (usage) {
        usageCandidates = usage.candidatesTokenCount ?? usageCandidates;
        usagePrompt = usage.promptTokenCount ?? usagePrompt;
        usageTotal = usage.totalTokenCount ?? usageTotal;
      }

      // Extract any textual parts from the first candidate
      const parts = chunk.candidates?.[0]?.content?.parts;
      const text = Array.isArray(parts)
        ? parts.map((p: any) => p?.text).filter(Boolean).join('')
        : '';

      if (text) {
        if (!firstTokenTime) firstTokenTime = Date.now();
        // Approximate token count by characters/parts when usage not yet available
        tokenCount += Math.max(1, Math.ceil(text.length / 4));
        generatedText += text;
        yield { type: 'chunk', content: text };
      }
    }

    const finishTime = Date.now();
    // Derive breakdown with preference for server usage; fallback to approximations
    const inputTokens = usagePrompt > 0 ? usagePrompt : approxTokensFromText(prompt);
    const outputTokens = usageCandidates > 0 ? usageCandidates : approxTokensFromText(generatedText);
    const finalTokenCount = usageTotal > 0 ? usageTotal : (inputTokens + outputTokens);
    yield {
      type: 'metrics',
      data: { startTime, firstTokenTime, finishTime, tokenCount: finalTokenCount, inputTokens, outputTokens },
    };
  },
};

registerProviderService(googleService);
