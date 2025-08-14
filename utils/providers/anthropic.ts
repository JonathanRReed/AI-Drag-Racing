// utils/providers/anthropic.ts

import {
  ProviderService,
  CompletionResult,
  registerProviderService,
} from '../providerService';

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
    // Anthropic doesn't have a public model listing API.
    // Models are hardcoded based on their documentation.
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
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

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
        max_tokens: 4096, // Anthropic requires max_tokens
      }),
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
          tokenCount++;
          yield { type: 'chunk', content };
        }
      }
    }

    const finishTime = Date.now();
    yield {
      type: 'metrics',
      data: { startTime, firstTokenTime, finishTime, tokenCount },
    };
  },
};

registerProviderService(anthropicService);
