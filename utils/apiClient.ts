// utils/apiClient.ts
import { CompletionResult } from './providerService';
import { parseSseJson } from './sse';

export interface ModelSettings {
  temperature: number;
  maxTokens: number;
  topP: number;
  reasoningEffort?: 'low' | 'medium' | 'high';
}

// This function will connect to our POST endpoint and stream the response.
export async function* streamCompletion(
  providerId: string,
  prompt: string,
  model: string,
  apiKey: string,
  settings?: ModelSettings,
  signal?: AbortSignal
): AsyncGenerator<CompletionResult> {

  const response = await fetch(`/api/providers/${providerId}/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, model, apiKey, settings }),
    signal,
  });

  if (!response.ok || !response.body) {
    const errorText = await response.text();
    throw new Error(`API Error (${response.status}): ${errorText || 'Failed to connect'}`);
  }

  yield* parseSseJson<CompletionResult>(response, 'AI Drag Racing');
}
