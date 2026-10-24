import { getEventListeners } from 'node:events';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { streamCompletion } from '../utils/apiClient';

beforeEach(() => { vi.stubGlobal('fetch', vi.fn(() => { throw new Error('External network forbidden'); })); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('settles a pending body read, releases its lock and removes the abort listener', async () => {
  const cancel = vi.fn();
  const body = new ReadableStream<Uint8Array>({ cancel });
  vi.stubGlobal('fetch', vi.fn(async () => new Response(body)));
  const controller = new AbortController();
  const stream = streamCompletion('openai', 'fixture', 'model', 'synthetic-key', undefined, controller.signal);
  const pending = stream.next();
  await new Promise<void>(resolve => setImmediate(resolve));
  const reason = new DOMException('Time limit reached', 'TimeoutError');
  controller.abort(reason);
  // Failure guard only. The operation itself must settle from cancellation.
  const check = expect(pending).rejects.toBe(reason);
  const guard = setTimeout(() => { void body.cancel().catch(() => {}); }, 1000);
  try { await check; } finally { clearTimeout(guard); }
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(body.locked).toBe(false);
  expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0);
});

it('does not swallow an unrelated upstream AbortError when the request signal is active', async () => {
  const reason = new DOMException('Provider aborted unexpectedly', 'AbortError');
  const body = new ReadableStream<Uint8Array>({ start(controller) { controller.error(reason); } });
  vi.stubGlobal('fetch', vi.fn(async () => new Response(body)));
  const controller = new AbortController();
  const stream = streamCompletion('openai', 'fixture', 'model', 'synthetic-key', undefined, controller.signal);
  await expect(stream.next()).rejects.toBe(reason);
  expect(body.locked).toBe(false);
  expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0);
});

it('removes its listener after natural EOF without aborting the request', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('data: {"type":"chunk","content":"fixture"}\n\n')));
  const controller = new AbortController();
  const stream = streamCompletion('openai', 'fixture', 'model', 'synthetic-key', undefined, controller.signal);
  expect((await stream.next()).value).toEqual({ type: 'chunk', content: 'fixture' });
  expect((await stream.next()).done).toBe(true);
  expect(controller.signal.aborted).toBe(false);
  expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0);
});
