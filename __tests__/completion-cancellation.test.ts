import { getEventListeners } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '@/pages/api/providers/[providerId]/completions';
import { getProviderService, registerProviderService, type ProviderService } from '@/utils/providerService';
import { parseSseJson } from '@/utils/sse';

const DEADLINE_MS = 2_000;
const TEST_TIMEOUT_MS = 10_000;
const encoder = new TextEncoder();
let providerSequence = 0;

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

// Timers are failure guards only. All sequencing is driven by explicit events.
async function bounded<T>(operation: PromiseLike<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timed out: ${label}`)), DEADLINE_MS);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function installProvider(generate: ProviderService['generate']) {
  const providerId = `cancellation-fixture-${++providerSequence}`;
  registerProviderService({ providerId, async getModels() { return []; }, generate });
  return providerId;
}

function request(providerId: string, signal?: AbortSignal) {
  return new Request(`https://ai-dragrace.jonathanrreed.com/api/providers/${providerId}/completions`, {
    method: 'POST', signal,
    body: JSON.stringify({ prompt: 'hello', model: 'fixture-model', apiKey: 'fixture-key' }),
  });
}

function blockedProvider(releaseOnAbort: boolean) {
  const started = deferred();
  const unblocked = deferred();
  const finished = deferred();
  const afterFirstYield = vi.fn();
  let providerSignal: AbortSignal | undefined;
  let didStart = false;
  const providerId = installProvider(async function* (_prompt, _model, _key, signal) {
    didStart = true;
    providerSignal = signal;
    const onAbort = () => { if (releaseOnAbort) unblocked.resolve(); };
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) onAbort();
    started.resolve();
    try {
      await unblocked.promise;
      // Deliberately yields once even after abort. The route owns output suppression.
      yield { type: 'chunk', content: 'late fixture output' };
      afterFirstYield();
      yield { type: 'chunk', content: 'must not request this after cancellation' };
    } finally {
      signal?.removeEventListener('abort', onAbort);
      finished.resolve();
    }
  });
  return {
    providerId, started, unblocked, finished, afterFirstYield,
    get signal() { return providerSignal; },
    async dispose(reader?: ReadableStreamDefaultReader<Uint8Array>) {
      // Always release the provider gate, even when an assertion or deadline fails.
      unblocked.resolve();
      if (reader) await bounded(reader.cancel(), 'fixture response cancellation').catch(() => {});
      if (didStart) await bounded(finished.promise, 'fixture provider cleanup').catch(() => {});
      try { reader?.releaseLock(); } catch { /* Already released. */ }
    },
  };
}

async function startBlockedCompletion(fixture: ReturnType<typeof blockedProvider>, signal?: AbortSignal) {
  const req = request(fixture.providerId, signal);
  const previousListeners = getEventListeners(req.signal, 'abort');
  const response = await bounded(handler(req), 'completion response');
  const reader = response.body!.getReader();
  try {
    const first = await bounded(reader.read(), 'initial metadata');
    expect(first.done).toBe(false);
    expect(new TextDecoder().decode(first.value)).toContain('"type":"meta"');
    await bounded(fixture.started.promise, 'provider entry');
    return { req, reader, previousListeners };
  } catch (error) {
    await fixture.dispose(reader);
    throw error;
  }
}

beforeEach(() => {
  // An unexpected real-provider path fails locally rather than contacting upstream.
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('Network forbidden in cancellation tests'); }));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('completion cancellation lifetime', () => {

  it.each(['response', 'request'])('does not request another provider result after %s cancellation rejects a pending chunk write', async (cancellationKind) => {
    const chunkWriteStarted = deferred();
    const releaseUnexpectedWork = deferred();
    const finished = deferred();
    const afterFirstYield = vi.fn();
    let providerSignal: AbortSignal | undefined;
    let resolveNextStep!: (step: 'resumed' | 'closed') => void;
    const nextStep = new Promise<'resumed' | 'closed'>((resolve) => { resolveNextStep = resolve; });
    const originalWrite = WritableStreamDefaultWriter.prototype.write;
    const writeSpy = vi.spyOn(WritableStreamDefaultWriter.prototype, 'write').mockImplementation(function (
      this: WritableStreamDefaultWriter<Uint8Array>, value?: Uint8Array,
    ) {
      const result = originalWrite.call(this, value);
      if (new TextDecoder().decode(value).includes('"type":"chunk"')) chunkWriteStarted.resolve();
      return result;
    });
    const providerId = installProvider(async function* (_prompt, _model, _key, signal) {
      providerSignal = signal;
      try {
        yield { type: 'chunk', content: 'backpressured fixture output' };
        afterFirstYield();
        resolveNextStep('resumed');
        // RED stays bounded: finally below always releases this artificial work.
        await releaseUnexpectedWork.promise;
      } finally {
        resolveNextStep('closed');
        finished.resolve();
      }
    });
    const controller = new AbortController();
    const req = request(providerId, controller.signal);
    const previousListeners = getEventListeners(req.signal, 'abort');
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const response = await bounded(handler(req), 'pending-write completion response');
      reader = response.body!.getReader();
      expect(new TextDecoder().decode((await bounded(reader.read(), 'initial metadata')).value))
        .toContain('"type":"meta"');
      // Do not issue a second read. The provider chunk must stay backpressured.
      await bounded(chunkWriteStarted.promise, 'provider chunk write entry');
      if (cancellationKind === 'request') controller.abort();
      else await bounded(reader.cancel('consumer leaves during pending write'), 'pending-write cancellation');
      expect(req.signal.aborted).toBe(cancellationKind === 'request');
      expect(providerSignal?.aborted).toBe(true);
      // This distinguishes a correct iterator.return() from an unwanted next().
      // Current code resolves "resumed" immediately; corrected code resolves "closed".
      expect(await bounded(nextStep, 'provider step after cancelled write')).toBe('closed');
      expect(afterFirstYield).not.toHaveBeenCalled();
      if (cancellationKind === 'request') {
        await expect(bounded(reader.read(), 'read after Request abort')).rejects.toMatchObject({ name: 'AbortError' });
      } else {
        expect(await bounded(reader.read(), 'read after response cancel')).toEqual({ done: true, value: undefined });
      }
      expect(getEventListeners(req.signal, 'abort')).toEqual(previousListeners);
    } finally {
      releaseUnexpectedWork.resolve();
      if (reader) await bounded(reader.cancel(), 'pending-write fixture cancellation').catch(() => {});
      if (providerSignal) await bounded(finished.promise, 'pending-write fixture shutdown').catch(() => {});
      try { reader?.releaseLock(); } catch { /* Already released. */ }
      writeSpy.mockRestore();
    }
  }, TEST_TIMEOUT_MS);

  it('aborts provider work when only the response consumer cancels', async () => {
    const fixture = blockedProvider(true);
    const context = await startBlockedCompletion(fixture);
    try {
      await bounded(context.reader.cancel('consumer left'), 'consumer cancellation');
      expect(context.req.signal.aborted).toBe(false);
      expect(fixture.signal?.aborted).toBe(true);
      await bounded(fixture.finished.promise, 'aborted provider shutdown');
    } finally {
      await fixture.dispose(context.reader);
    }
  }, TEST_TIMEOUT_MS);

  it('does not invoke a provider for an already-aborted Request', async () => {
    const generate = vi.fn<ProviderService['generate']>(async function* () {
      yield { type: 'chunk', content: 'provider must not start' };
    });
    const controller = new AbortController();
    const req = request(installProvider(generate), controller.signal);
    controller.abort();
    let response: Response | undefined;
    try {
      response = await bounded(handler(req), 'already-aborted request');
      await bounded(response.text(), 'already-aborted response');
    } catch (error) {
      // Returning an empty response or rejecting with AbortError are both valid.
      expect(error).toHaveProperty('name', 'AbortError');
    } finally {
      if (response?.body && !response.body.locked) {
        await bounded(response.body.cancel(), 'aborted-response cleanup').catch(() => {});
      }
    }
    expect(generate).not.toHaveBeenCalled();
  }, TEST_TIMEOUT_MS);

  it('removes its Request abort listener after normal completion', async () => {
    const providerId = installProvider(async function* () {
      yield { type: 'chunk', content: 'normal completion' };
    });
    const req = request(providerId);
    const previousListeners = getEventListeners(req.signal, 'abort');
    const response = await bounded(handler(req), 'normal completion response');
    try {
      expect(await bounded(response.text(), 'normal response body')).toContain('normal completion');
      expect(getEventListeners(req.signal, 'abort')).toEqual(previousListeners);
    } finally {
      if (response.body && !response.body.locked) {
        await bounded(response.body.cancel(), 'normal-response cleanup').catch(() => {});
      }
    }
  }, TEST_TIMEOUT_MS);

  it('stops consuming provider output after consumer cancellation', async () => {
    const fixture = blockedProvider(false);
    const context = await startBlockedCompletion(fixture);
    try {
      const cancellation = context.reader.cancel('consumer left');
      // Resolve a provider already suspended at next(); cancellation must win.
      fixture.unblocked.resolve();
      await bounded(cancellation, 'consumer cancellation');
      await bounded(fixture.finished.promise, 'late-yield provider cleanup');
      expect(fixture.afterFirstYield).not.toHaveBeenCalled();
      expect(await bounded(context.reader.read(), 'read after cancellation')).toEqual({ done: true, value: undefined });
    } finally {
      await fixture.dispose(context.reader);
    }
  }, TEST_TIMEOUT_MS);

  it('removes its Request abort listener after consumer cancellation', async () => {
    const fixture = blockedProvider(false);
    const context = await startBlockedCompletion(fixture);
    try {
      // Listener cleanup must not depend on a cooperative provider finishing.
      await bounded(context.reader.cancel('consumer left'), 'consumer cancellation');
      expect(getEventListeners(context.req.signal, 'abort')).toEqual(context.previousListeners);
    } finally {
      await fixture.dispose(context.reader);
    }
  }, TEST_TIMEOUT_MS);

  it('still forwards Request abort, suppresses late output, and removes its listener', async () => {
    const fixture = blockedProvider(true);
    const controller = new AbortController();
    const context = await startBlockedCompletion(fixture, controller.signal);
    try {
      const pending = context.reader.read().then(
        (result) => { expect(result.done).toBe(true); },
        () => undefined, // Existing callers may observe transport error or EOF.
      );
      controller.abort();
      await bounded(pending, 'request-aborted response');
      expect(fixture.signal?.aborted).toBe(true);
      await bounded(fixture.finished.promise, 'request-aborted provider shutdown');
      expect(fixture.afterFirstYield).not.toHaveBeenCalled();
      expect(getEventListeners(context.req.signal, 'abort')).toEqual(context.previousListeners);
    } finally {
      await fixture.dispose(context.reader);
    }
  }, TEST_TIMEOUT_MS);
});

function upstreamFixture(cancelFailure?: Error) {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  let terminated = false;
  const cancel = vi.fn(() => {
    terminated = true;
    if (cancelFailure) throw cancelFailure;
  });
  const body = new ReadableStream<Uint8Array>({
    start(value) { controller = value; }, cancel,
  });
  const response = new Response(body);
  // Call-through spy lets failed RED tests release a leaked real reader in finally.
  const getReader = vi.spyOn(body, 'getReader');
  const reader = () => getReader.mock.results[0]?.value as ReadableStreamDefaultReader<Uint8Array> | undefined;
  const close = () => { if (!terminated) { terminated = true; controller.close(); } };
  return {
    response, body, cancel, reader, close,
    enqueue(text: string) { controller.enqueue(encoder.encode(text)); },
    error(error: Error) { terminated = true; controller.error(error); },
    async dispose(iterator: AsyncGenerator<unknown, void, unknown>) {
      close(); // Unblocks a pending read before asking an async generator to return.
      const captured = reader();
      await bounded(iterator.return(undefined), 'SSE iterator cleanup').catch(() => {});
      if (captured) {
        await bounded(captured.cancel(), 'SSE reader cleanup').catch(() => {});
        try { captured.releaseLock(); } catch { /* Already released. */ }
      }
    },
  };
}

describe('parseSseJson reader lifetime', () => {
  it('cancels and releases an open upstream reader when its consumer returns early', async () => {
    const fixture = upstreamFixture();
    fixture.enqueue('data: {"value":1}\n\n');
    const iterator = parseSseJson(fixture.response, 'fixture');
    try {
      expect(await bounded(iterator.next(), 'first SSE event')).toEqual({ done: false, value: { value: 1 } });
      await bounded(iterator.return(undefined), 'early return');
      expect(fixture.cancel).toHaveBeenCalledTimes(1);
      expect(fixture.body.locked).toBe(false);
    } finally { await fixture.dispose(iterator); }
  }, TEST_TIMEOUT_MS);

  it('cancels and releases at DONE without emitting trailing events', async () => {
    const fixture = upstreamFixture();
    fixture.enqueue('data: [DONE]\n\ndata: {"unexpected":true}\n\n');
    const iterator = parseSseJson(fixture.response, 'fixture');
    try {
      expect(await bounded(iterator.next(), 'DONE sentinel')).toEqual({ done: true, value: undefined });
      expect(fixture.cancel).toHaveBeenCalledTimes(1);
      expect(fixture.body.locked).toBe(false);
    } finally { await fixture.dispose(iterator); }
  }, TEST_TIMEOUT_MS);

  it('releases its reader after natural upstream EOF', async () => {
    const fixture = upstreamFixture();
    fixture.close();
    const iterator = parseSseJson(fixture.response, 'fixture');
    try {
      expect(await bounded(iterator.next(), 'upstream EOF')).toEqual({ done: true, value: undefined });
      expect(fixture.body.locked).toBe(false);
    } finally { await fixture.dispose(iterator); }
  }, TEST_TIMEOUT_MS);

  it.each([false, true])('cleans up a rejected read (AbortError: %s) without masking it', async (aborted) => {
    const fixture = upstreamFixture();
    const failure = new Error('fixture upstream failure');
    if (aborted) failure.name = 'AbortError';
    const iterator = parseSseJson(fixture.response, 'fixture');
    try {
      const pending = iterator.next();
      const cancelReader = vi.spyOn(fixture.reader()!, 'cancel');
      // A real errored stream makes reader.cancel() reject as well. Cleanup must
      // still release the lock and preserve the parser's existing error policy.
      fixture.error(failure);
      if (aborted) {
        expect(await bounded(pending, 'aborted read')).toEqual({ done: true, value: undefined });
      } else {
        await expect(bounded(pending, 'failed read')).rejects.toBe(failure);
      }
      expect(cancelReader).toHaveBeenCalledTimes(1);
      expect(fixture.body.locked).toBe(false);
    } finally { await fixture.dispose(iterator); }
  }, TEST_TIMEOUT_MS);

  it('releases the reader even when early-return cancellation itself rejects', async () => {
    const fixture = upstreamFixture(new Error('fixture cancel failed'));
    fixture.enqueue('data: {"value":1}\n\n');
    const iterator = parseSseJson(fixture.response, 'fixture');
    try {
      await bounded(iterator.next(), 'first SSE event');
      expect(await bounded(iterator.return(undefined), 'early return with cancel failure'))
        .toEqual({ done: true, value: undefined });
      expect(fixture.cancel).toHaveBeenCalledTimes(1);
      expect(fixture.body.locked).toBe(false);
    } finally { await fixture.dispose(iterator); }
  }, TEST_TIMEOUT_MS);
});


describe('Google stream reader and watchdog lifetime', () => {
  it('preserves normal completion metrics and leaves the provider signal un-aborted at EOF', async () => {
    const fixture = upstreamFixture();
    fixture.enqueue('data: {"candidates":[{"content":{"parts":[{"text":"fixture"}]}}],"usageMetadata":{"promptTokenCount":1,"candidatesTokenCount":2,"totalTokenCount":3}}\n\n');
    fixture.close();
    let providerSignal: AbortSignal | undefined;
    const fetchFixture = vi.fn(async (_url: string, init: RequestInit) => {
      providerSignal = init.signal ?? undefined;
      return fixture.response;
    });
    vi.stubGlobal('fetch', fetchFixture);
    const req = request('google');
    const listeners = getEventListeners(req.signal, 'abort');
    const response = await bounded(handler(req), 'Google normal response');
    const events = (await bounded(response.text(), 'Google normal EOF')).split('\n\n').filter(Boolean).map(line => JSON.parse(line.slice(6)));
    expect(events.map(event => event.type)).toEqual(['meta', 'chunk', 'metrics']);
    expect(events[2].data).toMatchObject({ tokenCount: 3, inputTokens: 1, outputTokens: 2 });
    expect(providerSignal?.aborted).toBe(false);
    expect(fixture.body.locked).toBe(false);
    expect(getEventListeners(req.signal, 'abort')).toEqual(listeners);
    expect(fetchFixture).toHaveBeenCalledTimes(1);
  }, TEST_TIMEOUT_MS);

  it('cancels and releases its upstream reader when the provider consumer returns early', async () => {
    const fixture = upstreamFixture();
    fixture.enqueue('data: {"candidates":[{"content":{"parts":[{"text":"fixture"}]}}]}\n\n');
    vi.stubGlobal('fetch', vi.fn(async () => fixture.response));
    const iterator = getProviderService('google')!.generate('fixture', 'fixture-model', 'fixture-key');
    try {
      expect(await bounded(iterator.next(), 'Google fixture chunk')).toMatchObject({ value: { type: 'chunk', content: 'fixture' } });
      await bounded(iterator.return(undefined), 'Google early return');
      expect(fixture.cancel).toHaveBeenCalledTimes(1);
      expect(fixture.body.locked).toBe(false);
    } finally { await fixture.dispose(iterator); }
  }, TEST_TIMEOUT_MS);

  it('clears its inactivity watchdog and releases the reader when an upstream read rejects', async () => {
    const fixture = upstreamFixture();
    const failure = new Error('Google fixture read failure');
    fixture.error(failure);
    vi.stubGlobal('fetch', vi.fn(async () => fixture.response));
    const iterator = getProviderService('google')!.generate('fixture', 'fixture-model', 'fixture-key');
    vi.useFakeTimers();
    try {
      await expect(iterator.next()).rejects.toBe(failure);
      expect(vi.getTimerCount()).toBe(0);
      expect(fixture.body.locked).toBe(false);
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
      await fixture.dispose(iterator);
    }
  }, TEST_TIMEOUT_MS);
});
