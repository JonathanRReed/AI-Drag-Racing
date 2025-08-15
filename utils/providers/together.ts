// utils/providers/together.ts

import {
  ProviderService,
  CompletionResult,
  registerProviderService,
} from '../providerService';
import { fetchTogetherModels } from '../fetchModels';

async function* streamSSE(response: Response): AsyncGenerator<any, void, unknown> {
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
      if (part.startsWith('data: ')) {
        const data = part.substring(6).trim();
        if (data === '[DONE]') return;
        try {
          yield JSON.parse(data);
        } catch (e) {
          // ignore malformed lines
        }
      }
    }
  }
}

const togetherService: ProviderService = {
  providerId: 'together',

  async getModels(apiKey: string): Promise<string[]> {
    return await fetchTogetherModels(apiKey);
  },

  async *generate(
    prompt: string,
    model: string,
    apiKey: string,
  ): AsyncGenerator<CompletionResult> {
    const startTime = Date.now();
    let firstTokenTime: number | undefined;
    let tokenCount = 0;

    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Together API error: ${response.status} ${errorBody}`);
    }

    for await (const chunk of streamSSE(response)) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        if (!firstTokenTime) firstTokenTime = Date.now();
        tokenCount++;
        yield { type: 'chunk', content };
      }
    }

    const finishTime = Date.now();
    yield { type: 'metrics', data: { startTime, firstTokenTime, finishTime, tokenCount } };
  },
};

registerProviderService(togetherService);
