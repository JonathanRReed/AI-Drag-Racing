// utils/providers/groq.ts

import {
  ProviderService,
  CompletionResult,
  registerProviderService,
  ModelSettings,
} from '../providerService';
import { finalTokenTotal, approxTokensFromText } from '../tokens';

// Since Groq's API is OpenAI-compatible, we can reuse the stream parser.
// In a real-world scenario, we might move this to a shared utility file.
async function* streamOpenAIResponse(
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
    const lines = chunk.split('\n\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.substring(6);
        if (data.trim() === '[DONE]') {
          return;
        }
        try {
          yield JSON.parse(data);
        } catch (e) {
          console.error('Error parsing Groq stream data:', e);
        }
      }
    }
  }
}


const groqService: ProviderService = {
  providerId: 'groq',

  async getModels(apiKey: string): Promise<string[]> {
    // Groq doesn't have a public /v1/models endpoint that lists all models available.
    // The models are typically known beforehand from their documentation.
    // We will return a hardcoded list of common models.
    return [
      'llama3-8b-8192',
      'llama3-70b-8192',
      'mixtral-8x7b-32768',
      'gemma-7b-it',
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

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
        top_p: settings?.topP ?? 1.0,
      }),
      signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Groq API error: ${response.status} ${errorBody}`);
    }

    for await (const chunk of streamOpenAIResponse(response)) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        if (!firstTokenTime) {
          firstTokenTime = Date.now();
        }
        tokenCount++; // maintain for TPS-like metrics; final total computed below
        generatedText += content;
        yield { type: 'chunk', content };
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

registerProviderService(groqService);
