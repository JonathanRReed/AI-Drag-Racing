// utils/providers/google.ts

import {
  ProviderService,
  CompletionResult,
  registerProviderService,
} from '../providerService';

// Custom stream parser for Google's API format
async function* streamGoogleResponse(
  response: Response
): AsyncGenerator<any, void, unknown> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    // Google streams a JSON array, so we look for complete JSON objects
    // This is a simplified parser. A more robust one would handle complex cases.
    let start = buffer.indexOf('{');
    let end = buffer.indexOf('}');
    while (start !== -1 && end !== -1 && start < end) {
      const jsonStr = buffer.substring(start, end + 1);
      try {
        yield JSON.parse(jsonStr);
      } catch (e) {
        console.error('Error parsing Google stream data:', e);
      }
      buffer = buffer.substring(end + 1);
      start = buffer.indexOf('{');
      end = buffer.indexOf('}');
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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
