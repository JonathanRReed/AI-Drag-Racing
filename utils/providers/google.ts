// utils/providers/google.ts

import {
  ProviderService,
  CompletionResult,
  registerProviderService,
} from '../providerService';

// Parse Server-Sent Events (SSE) from Google Gemini streamGenerateContent
async function* streamGoogleResponse(
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
      // Expect lines like: "data: {json}"
      const line = part.trim();
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        yield JSON.parse(data);
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
    apiKey: string
  ): AsyncGenerator<CompletionResult> {
    const startTime = Date.now();
    let firstTokenTime: number | undefined;
    let tokenCount = 0;

    // Use alt=sse and send API key via header per docs
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Google API error: ${response.status} ${errorBody}`);
    }

    for await (const chunk of streamGoogleResponse(response)) {
      const content = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
      if (content) {
        if (!firstTokenTime) {
          firstTokenTime = Date.now();
        }
        tokenCount++;
        yield { type: 'chunk', content };
      }
    }

    const finishTime = Date.now();
    yield {
      type: 'metrics',
      data: { startTime, firstTokenTime, finishTime, tokenCount },
    };
  },
};

registerProviderService(googleService);
