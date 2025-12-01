// utils/providers/cohere.ts

import {
  ProviderService,
  CompletionResult,
  registerProviderService,
  ModelSettings,
} from '../providerService';
import { finalTokenTotal, approxTokensFromText } from '../tokens';

// Cohere v2 streams SSE events with types like content-delta, message-end
async function* streamCohereResponse(
  response: Response
): AsyncGenerator<any, void, unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';
    for (const part of parts) {
      if (!part.startsWith('data:')) continue;
      const data = part.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const parsed = JSON.parse(data);
        yield parsed;
      } catch {}
    }
  }
}

const cohereService: ProviderService = {
  providerId: 'cohere',

  async getModels(apiKey: string): Promise<string[]> {
    const res = await fetch('https://api.cohere.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error('Failed to fetch Cohere models');
    const data = await res.json();
    const arr = Array.isArray(data?.models)
      ? data.models
      : Array.isArray(data?.data)
      ? data.data
      : [];
    return arr.map((m: any) => m.name || m.id).filter(Boolean);
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
    let tokenCount = 0;
    let generatedText = '';

    const response = await fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
        temperature: settings?.temperature ?? 0.7,
        max_tokens: settings?.maxTokens ?? 2048,
        p: settings?.topP ?? 1.0,
      }),
      signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Cohere API error: ${response.status} ${errorBody}`);
    }

    for await (const evt of streamCohereResponse(response)) {
      // v2 emits { type: 'content-delta', delta: { message: { content: { text }}}}
      const type = evt?.type;
      if (type === 'content-delta') {
        const content = evt?.delta?.message?.content?.text;
        if (typeof content === 'string' && content.length > 0) {
          if (!firstTokenTime) firstTokenTime = Date.now();
          tokenCount++; // maintain for TPS-like metrics; final total computed below
          generatedText += content;
          yield { type: 'chunk', content };
        }
      }
    }

    const finishTime = Date.now();
    const total = finalTokenTotal({ prompt, generated: generatedText });
    const inputTokens = approxTokensFromText(prompt);
    const outputTokens = approxTokensFromText(generatedText);
    yield { type: 'metrics', data: { startTime, firstTokenTime, finishTime, tokenCount: total, inputTokens, outputTokens } };
  },
};

registerProviderService(cohereService);
