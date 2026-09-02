export async function* parseSseJson<T = unknown>(
  response: Response,
  sourceLabel = 'SSE',
): AsyncGenerator<T, void, unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  const parseEvent = (event: string): { done: boolean; value?: T } => {
    const data = event
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n')
      .trim();
    if (!data) return { done: false };
    if (data === '[DONE]') return { done: true };
    try {
      return { done: false, value: JSON.parse(data) as T };
    } catch (error) {
      console.error(`Error parsing ${sourceLabel} stream data:`, error);
      return { done: false };
    }
  };

  while (true) {
    let done: boolean;
    let value: Uint8Array | undefined;
    try {
      ({ done, value } = await reader.read());
    } catch (error) {
      const message = String(error instanceof Error ? error.message : error);
      const code = error && typeof error === 'object' && 'code' in error
        ? String((error as { code?: unknown }).code ?? '')
        : '';
      if ((error instanceof Error && error.name === 'AbortError') || code === 'ECONNRESET' || message.includes('aborted')) return;
      throw error;
    }
    buffer += decoder.decode(value, { stream: !done });
    buffer = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const event = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const parsed = parseEvent(event);
      if (parsed.done) return;
      if (parsed.value !== undefined) yield parsed.value;
      boundary = buffer.indexOf('\n\n');
    }

    if (done) break;
  }

  const finalEvent = parseEvent(buffer);
  if (!finalEvent.done && finalEvent.value !== undefined) yield finalEvent.value;
}
