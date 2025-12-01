// utils/apiClient.ts
import { CompletionResult } from './providerService';

export interface ModelSettings {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

// This function will connect to our POST endpoint and stream the response.
export async function* streamCompletion(
  providerId: string,
  prompt: string,
  model: string,
  apiKey: string,
  settings?: ModelSettings
): AsyncGenerator<CompletionResult> {

  const response = await fetch(`/api/providers/${providerId}/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, model, apiKey, settings }),
  });

  if (!response.ok || !response.body) {
    const errorText = await response.text();
    throw new Error(`API Error (${response.status}): ${errorText || 'Failed to connect'}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    // Append the new chunk to the buffer
    buffer += decoder.decode(value, { stream: true });

    // SSE messages are separated by double newlines
    const parts = buffer.split('\n\n');

    // The last part might be incomplete, so we keep it in the buffer
    buffer = parts.pop() || '';

    for (const part of parts) {
      if (part.startsWith('data: ')) {
        const dataString = part.substring(6);
        try {
          const parsedData = JSON.parse(dataString) as CompletionResult;
          yield parsedData;
        } catch (e) {
          console.error('Error parsing JSON from stream:', dataString);
        }
      }
    }
  }
}
