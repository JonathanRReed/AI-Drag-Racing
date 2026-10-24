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

// Read diagnostics with the same cancellation ownership as a successful SSE
// body. response.text() hides its reader, so it cannot be cancelled explicitly.
async function readErrorText(response: Response, signal?: AbortSignal): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return response.text();
  const decoder = new TextDecoder();
  let text = '';
  let done = false;
  let cancelled = false;
  const cancel = () => {
    if (cancelled) return;
    cancelled = true;
    void reader.cancel(signal?.reason).catch(() => {});
  };
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    if (signal?.aborted) { cancel(); signal.throwIfAborted(); }
    while (!done) {
      const result = await reader.read();
      signal?.throwIfAborted();
      done = result.done;
      text += decoder.decode(result.value, { stream: !done });
    }
    return text;
  } finally {
    signal?.removeEventListener('abort', cancel);
    if (!done) cancel();
    reader.releaseLock();
  }
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

  signal?.throwIfAborted();
  const response = await fetch(`/api/providers/${providerId}/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, model, apiKey, settings }),
    signal,
  });

  if (!response.ok || !response.body) {
    let errorText = '';
    try {
      errorText = await readErrorText(response, signal);
    } catch {
      // The HTTP failure is already known. Aborting its diagnostics must not
      // turn that provider failure into a successful Time Trial limit stop.
      errorText = 'Failed to read error response';
    }
    // Redact the complete diagnostic, including fallback text, before constructing an Error.
    throw new Error(redactCredentials(`API Error (${response.status}): ${errorText || 'Failed to connect'}`, apiKey));
  }

  yield* parseSseJson<CompletionResult>(response, 'AI Drag Racing', signal);
}
