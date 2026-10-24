// utils/apiClient.ts
import { CompletionResult } from './providerService';
import { parseSseJson } from './sse';
import { redactCredentials } from './requestSecurity';

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
    // Redact the complete diagnostic, including fallback text, before constructing an Error.
    throw new Error(redactCredentials(`API Error (${response.status}): ${errorText || 'Failed to connect'}`, apiKey));
  }

  yield* parseSseJson<CompletionResult>(response, 'AI Drag Racing');
}
