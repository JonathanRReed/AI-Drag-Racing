// utils/providers/anthropic.ts

import {
  ProviderService,
  CompletionResult,
  registerProviderService,
  ModelSettings,
} from '../providerService';
import { finalTokenTotal, approxTokensFromText } from '../tokens';

// Custom stream parser for Anthropic's API format
async function* streamAnthropicResponse(
  response: Response
): AsyncGenerator<any, void, unknown> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }
  const decoder = new TextDecoder('utf-8');
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.substring(6);
        try {
          yield JSON.parse(data);
        } catch (e) {
          console.error('Error parsing Anthropic stream data:', e);
        }
      }
    }
  }
}

const anthropicService: ProviderService = {
  providerId: 'anthropic',

  async getModels(apiKey: string): Promise<string[]> {
    // List Models endpoint (docs): GET https://api.anthropic.com/v1/models
    // Requires x-api-key and anthropic-version headers.
    try {
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      });
      if (!res.ok) throw new Error(`Anthropic models error: ${res.status}`);
      const data = await res.json();
      if (Array.isArray((data as any)?.data)) {
        return (data as any).data
          .map((m: any) => m.id)
          .filter((id: string) => typeof id === 'string');
      }
    } catch (e) {
      console.warn('[Anthropic] Falling back to static model list:', e);
    }
    // Fallback static list
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
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
    let tokenCount = 0;
    let generatedText = '';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
        max_tokens: settings?.maxTokens ?? 4096,
        temperature: settings?.temperature ?? 0.7,
        top_p: settings?.topP ?? 1.0,
      }),
      signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${errorBody}`);
    }

    for await (const chunk of streamAnthropicResponse(response)) {
      if (chunk.type === 'content_block_delta') {
        const content = chunk.delta?.text;
        if (content) {
          if (!firstTokenTime) {
            firstTokenTime = Date.now();
          }
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
    yield {
      type: 'metrics',
      data: { startTime, firstTokenTime, finishTime, tokenCount: total, inputTokens, outputTokens },
    };
  },
};

registerProviderService(anthropicService);
