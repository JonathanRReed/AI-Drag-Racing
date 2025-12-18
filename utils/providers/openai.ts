// utils/providers/openai.ts

import {
  ProviderService,
  CompletionResult,
  registerProviderService,
  ModelSettings,
} from '../providerService';
import { finalTokenTotal, approxTokensFromText } from '../tokens';

// A helper to parse the SSE stream from OpenAI
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
          console.error('Error parsing OpenAI stream data:', e);
        }
      }
    }
  }
}

const openAIService: ProviderService = {
  providerId: 'openai',

  async getModels(apiKey: string): Promise<string[]> {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch OpenAI models');
    }
    const { data } = await response.json();
    // Filter for gpt models which are for chat completions
    return data.map((model: any) => model.id).filter((id: string) => id.startsWith('gpt'));
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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
        ...(settings?.reasoningEffort && (
          model.startsWith('o1') ||
          model.startsWith('o3') ||
          model.startsWith('gpt-5') ||
          model.includes('reasoning')
        )
          ? { reasoning_effort: settings.reasoningEffort }
          : {}
        )
      }),
      signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorBody}`);
    }

    for await (const chunk of streamOpenAIResponse(response)) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        if (!firstTokenTime) {
          firstTokenTime = Date.now();
        }
        tokenCount++; // maintain for TPS-style metrics; final total computed below
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

registerProviderService(openAIService);
