import { redactCredentials } from './requestSecurity';

export async function* parseSseJson<T = unknown>(
  response: Response,
  sourceLabel = 'SSE',
  signal?: AbortSignal,
): AsyncGenerator<T, void, unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  const parseEvent = (event: string): { done: boolean; value?: T } => {
    // Fast single-pass line extraction without intermediate array allocations per chunk
    let data = '';
    const lines = event.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('data:')) {
        const payload = line.slice(5).trimStart();
        data = data ? data + '\n' + payload : payload;
      }
    }
    data = data.trim();
    if (!data) return { done: false };
    if (data === '[DONE]') return { done: true };
    try {
      return { done: false, value: JSON.parse(data) as T };
    } catch (error) {
      // Log only the sanitized message. Mutating Error.message leaves cached
      // stacks and other exception properties available to console inspectors.
      console.error(`Error parsing ${sourceLabel} stream data:`, redactCredentials(error));
      return { done: false };
    }
  };

  let reachedEof = false;
  let cancellation: Promise<void> | undefined;
  const cancelReader = () => {
    // Cancel the reader itself: aborting fetch alone cannot release every body
    // implementation, and iterator.return() queues behind a pending next().
    cancellation ??= reader.cancel(signal?.reason).catch(() => {});
  };
  signal?.addEventListener('abort', cancelReader, { once: true });
  try {
    if (signal?.aborted) { cancelReader(); signal.throwIfAborted(); }
    while (true) {
      let done: boolean;
      let value: Uint8Array | undefined;
      try {
        ({ done, value } = await reader.read());
        signal?.throwIfAborted();
      } catch (error) {
        // Client callers distinguish an intentional deadline from provider failure.
        if (signal) throw signal.aborted ? signal.reason : error;
        const message = String(error instanceof Error ? error.message : error);
        const code = error && typeof error === 'object' && 'code' in error
          ? String((error as { code?: unknown }).code ?? '')
          : '';
        if ((error instanceof Error && error.name === 'AbortError') || code === 'ECONNRESET' || message.includes('aborted')) return;
        throw error;
      }
      buffer += decoder.decode(value, { stream: !done });
      // Performance optimization: avoid regex scan across whole buffer unless CRLF is present
      if (buffer.includes('\r')) {
        buffer = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      }

      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const event = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const parsed = parseEvent(event);
        if (parsed.done) return;
        signal?.throwIfAborted();
        if (parsed.value !== undefined) yield parsed.value;
        boundary = buffer.indexOf('\n\n');
      }

      if (done) { reachedEof = true; break; }
    }

    const finalEvent = parseEvent(buffer);
    if (!finalEvent.done && finalEvent.value !== undefined) yield finalEvent.value;
  } finally {
    signal?.removeEventListener('abort', cancelReader);
    // A consumer break, DONE sentinel or read error must release upstream work.
    // Cleanup failure must never replace the parser's original result/error.
    if (!reachedEof) {
      cancelReader();
      // Cancelling closes the reader and settles pending reads immediately, but
      // an underlying source may never settle its own cleanup promise. A signal
      // stop must release the lane now; cancelReader already handles rejection.
      if (!signal) {
        await cancellation;
      } else if (!signal.aborted) {
        // Cleanup may have started before the deadline (for example at [DONE]).
        // Keep that wait interruptible if the source's cancel hook hangs.
        let stopWaiting!: () => void;
        const stopped = new Promise<void>(resolve => { stopWaiting = resolve; });
        signal.addEventListener('abort', stopWaiting, { once: true });
        try {
          await Promise.race([cancellation, stopped]);
        } finally {
          signal.removeEventListener('abort', stopWaiting);
        }
      }
    }
    reader.releaseLock();
  }

}
