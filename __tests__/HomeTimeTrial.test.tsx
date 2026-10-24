// @vitest-environment happy-dom
import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Home from '../pages/index';
import { click, inputValue, mount } from './reactDom';
import type { ResultState } from '../components/main/ResultsDisplay';
import type { RaceReceipt } from '../utils/raceReceipts';

vi.mock('next/router', () => ({ useRouter: () => ({ pathname: '/', query: {}, replace: vi.fn() }) }));
vi.mock('next/head', () => ({ default: () => null }));
const rendered = vi.hoisted(() => ({ results: [] as ResultState[] }));
// Omit canvas/dynamic layers only. Home, controls, apiClient, SSE, receipts and summary are real.
vi.mock('next/dynamic', () => ({ default: () => (props: { results?: ResultState[] }) => {
  if (props.results) rendered.results = props.results;
  return null;
} }));

let view: ReturnType<typeof mount> | undefined;
const requests: AbortSignal[] = [];
const bodies: BodyFixture[] = [];
const encoder = new TextEncoder();
const providerMetrics = { startTime: 100, firstTokenTime: 200, finishTime: 300, tokenCount: 42, outputTokens: 40, tokenCountSource: 'provider-reported', timingSource: 'edge-measured' };
interface BodyFixture {
  body: ReadableStream<Uint8Array>;
  cancel: ReturnType<typeof vi.fn>;
  emit(event: unknown): void;
  done(): void;
  close(): void;
  error(error: Error): void;
}
function bodyFixture(cancelWork?: () => void | Promise<void>): BodyFixture {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const cancel = vi.fn(cancelWork);
  const body = new ReadableStream<Uint8Array>({ start(c) { controller = c; }, cancel });
  const fixture = { body, cancel, emit(event: unknown) { controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`)); }, done() { controller.enqueue(encoder.encode('data: [DONE]\n\n')); }, close() { controller.close(); }, error(e: Error) { controller.error(e); } };
  bodies.push(fixture);
  return fixture;
}
function installBodies(...fixtures: ReturnType<typeof bodyFixture>[]) {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    expect(url).toBe('/api/providers/openai/completions');
    requests.push(init.signal as AbortSignal);
    const fixture = fixtures.shift();
    if (!fixture) throw new Error('Unexpected fetch; external network forbidden');
    return new Response(fixture.body);
  }));
}
async function settle() { await act(async () => { await new Promise<void>(resolve => setImmediate(resolve)); }); }
async function advance(ms: number) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); await settle(); }
async function emit(fixture: ReturnType<typeof bodyFixture>, event: unknown) { await act(async () => { fixture.emit(event); }); await settle(); }
function history(): RaceReceipt[] { return JSON.parse(localStorage.getItem('ai-drag-racing:history:v1') ?? '[]'); }
function button(label: string) { return [...view!.container.querySelectorAll<HTMLButtonElement>('button')].find(n => n.textContent?.includes(label))!; }
async function setup(models = ['fixture-model'], reducedMotion = true) {
  sessionStorage.setItem('openai_api_key', 'synthetic-test-key');
  localStorage.setItem('openai_models', JSON.stringify(models));
  localStorage.setItem('openai_selected_models', JSON.stringify(models));
  vi.spyOn(window, 'matchMedia').mockImplementation(() => ({ matches: reducedMotion, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList);
  await act(async () => { view = mount(<Home />); });
  click(button('Experiment Lab'));
  click(view!.container.querySelector('button[aria-controls="race-settings-content"]')!);
  click(button('Time Trial'));
  inputValue(view!.container.querySelector('#race-time-limit')!, '5');
}
async function start() { await act(async () => { click(view!.container.querySelector('.race-start-button')!); }); await settle(); }
function reset() { click(view!.container.querySelector('.race-reset-button')!); }
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  // Keep unrelated fingerprint hashing deterministic; real receipt creation still runs.
  vi.spyOn(crypto.subtle, 'digest').mockResolvedValue(new ArrayBuffer(32));
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('External network forbidden'); }));
  vi.useFakeTimers({ toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame'] });
  vi.setSystemTime(new Date('2026-10-24T17:00:00Z'));
  localStorage.clear(); sessionStorage.clear(); requests.length = 0; bodies.length = 0; rendered.results = [];
});
afterEach(async () => {
  view?.unmount(); view = undefined;
  for (const fixture of bodies) { try { fixture.close(); } catch { /* Cancelled or errored. */ } }
  await settle();
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  localStorage.clear(); sessionStorage.clear();
});

describe('real Home Time Trial deadline', () => {
  it('keeps current-run and stored output leaders aligned after settings change', async () => {
    await setup(['short', 'org/👩\u200d💻']); const early = bodyFixture(); const late = bodyFixture(); installBodies(early, late); await start();
    await advance(1000); await emit(early, { type: 'chunk', content: 'a' });
    await emit(early, { type: 'metrics', data: providerMetrics });
    await act(async () => { early.close(); }); await settle();
    await advance(2000); await emit(late, { type: 'chunk', content: '😀abc' }); await advance(2000);
    expect(history()[0].lanes.map(lane => lane.outputCharacters)).toEqual([1, 5]);
    expect(history()[0].lanes[1].modelId).toBe('org/👩\u200d💻');
    expect(JSON.parse(vi.mocked(fetch).mock.calls[1][1]!.body as string).model).toBe('org/👩\u200d💻');
    expect(view!.container.querySelector('.finish-board-lead bdi')?.textContent).toBe('org/👩\u200d💻');
    expect(view!.container.querySelector('.race-history-row strong bdi')?.textContent).toBe('org/👩\u200d💻');
    click(button('Free Run')); await settle();
    expect(view!.container.querySelector('#finish-heading')?.textContent).toBe('Most output, this Time Trial');
    expect(view!.container.querySelector('.finish-board-lead bdi')?.textContent).toBe('org/👩\u200d💻');
    expect(history()).toHaveLength(1);
    reset(); await settle();
    const nextEarly = bodyFixture(); const nextLate = bodyFixture(); installBodies(nextEarly, nextLate); await start();
    await advance(1000); await emit(nextEarly, { type: 'chunk', content: 'a' });
    await emit(nextEarly, { type: 'metrics', data: providerMetrics });
    await act(async () => { nextEarly.close(); }); await settle();
    await advance(1000); await emit(nextLate, { type: 'chunk', content: 'a'.repeat(100) });
    await emit(nextLate, { type: 'metrics', data: providerMetrics });
    await act(async () => { nextLate.close(); }); await settle();
    expect(history()).toHaveLength(2); expect(history().map(value => value.mode)).toEqual(['free_for_all', 'time_limit']);
    expect(view!.container.querySelector('#finish-heading')?.textContent).toBe('Fastest here, this run');
    expect(view!.container.querySelector('.finish-board-lead bdi')?.textContent).toBe('short');
    expect(history()[0].lanes.map(lane => lane.outputCharacters)).toEqual([1, 100]);
  });

  it.each([false, true])('finishes and cancels a silent body at five seconds (has content=%s)', async hasContent => {
    await setup(); const fixture = bodyFixture(); installBodies(fixture); await start();
    await advance(1000);
    if (hasContent) await emit(fixture, { type: 'chunk', content: 'before' });
    await advance(3999); expect(history()).toHaveLength(0);
    await advance(1);
    expect(history()).toHaveLength(1);
    expect(history()[0].lanes[0]).toMatchObject({ outputTokens: hasContent ? 1 : 0, timingSource: 'browser-synthetic', browser: { ttftMs: hasContent ? 1000 : null, totalMs: 5000 }, status: 'completed' });
    expect(rendered.results[0].responseText).toBe(hasContent ? 'before' : '');
    expect(requests[0].aborted).toBe(true);
    expect(fixture.cancel).toHaveBeenCalledTimes(1); expect(fixture.body.locked).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('aborts a still-pending fetch and completes with no tokens', async () => {
    await setup();
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
      const signal = init.signal!; requests.push(signal);
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    })));
    await start(); await advance(5000);
    expect(requests[0].aborted).toBe(true);
    expect(history()[0].lanes[0]).toMatchObject({ outputTokens: 0, browser: { ttftMs: null, totalMs: 5000 }, status: 'completed' });
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each([4999, 5000, 6000])('applies the strict cutoff to a chunk observed at %i ms even before a delayed timer fires', async at => {
    await setup(); const fixture = bodyFixture(); installBodies(fixture); await start();
    // Stall timer callbacks, but advance the monotonic observation clock coherently.
    vi.spyOn(performance, 'now').mockReturnValue(at);
    vi.setSystemTime(new Date('2026-10-24T17:00:00Z').getTime() + at);
    await emit(fixture, { type: 'chunk', content: 'boundary' });
    if (at < 5000) { await act(async () => { fixture.close(); }); await settle(); }
    expect(history()).toHaveLength(1);
    expect(rendered.results[0].responseText).toBe(at < 5000 ? 'boundary' : '');
    expect(history()[0].lanes[0]).toMatchObject({ outputTokens: at < 5000 ? 1 : 0, browser: { totalMs: at } });
    expect(fixture.body.locked).toBe(false); expect(vi.getTimerCount()).toBe(0);
  });
  it.each([4999, 5000, 6000])('accepts provider metrics only before the cutoff (%i ms)', async at => {
    await setup(); const fixture = bodyFixture(); installBodies(fixture); await start();
    vi.spyOn(performance, 'now').mockReturnValue(at);
    vi.setSystemTime(new Date('2026-10-24T17:00:00Z').getTime() + at);
    await emit(fixture, { type: 'metrics', data: providerMetrics });
    await act(async () => { try { fixture.close(); } catch { /* Deadline cancels. */ } }); await settle();
    expect(history()[0].lanes[0]).toMatchObject({ outputTokens: at < 5000 ? 40 : 0, timingSource: at < 5000 ? 'edge-measured' : 'browser-synthetic', browser: { totalMs: at } });
  });
  it.each([-3600000, 3600000])('ignores a wall-clock jump of %i ms for deadline and synthetic duration', async jump => {
    await setup(); const fixture = bodyFixture(); installBodies(fixture); await start();
    await advance(1000); await emit(fixture, { type: 'chunk', content: 'first' });
    vi.setSystemTime(Date.now() + jump);
    await advance(4000);
    expect(history()[0].lanes[0].browser).toEqual({ ttftMs: 1000, totalMs: 5000 });
    const metrics = rendered.results[0].metrics!;
    expect(metrics.finishTime! - metrics.startTime).toBe(5000);
    expect(metrics.firstTokenTime! - metrics.startTime).toBe(1000);
  });
  it('preserves an early completed lane while a staggered second lane reaches the shared cutoff', async () => {
    await setup(['early', 'late']); const early = bodyFixture(); const late = bodyFixture(); installBodies(early, late); await start();
    await advance(1000); await emit(early, { type: 'chunk', content: 'early' });
    await emit(early, { type: 'metrics', data: providerMetrics });
    await act(async () => { early.close(); }); await settle();
    await advance(2000); await emit(late, { type: 'chunk', content: 'late' });
    await advance(2000);
    expect(history()[0].lanes).toEqual(expect.arrayContaining([
      expect.objectContaining({ modelId: 'early', outputTokens: 40, timingSource: 'edge-measured', browser: { ttftMs: 1000, totalMs: 1000 } }),
      expect.objectContaining({ modelId: 'late', outputTokens: 1, timingSource: 'browser-synthetic', browser: { ttftMs: 3000, totalMs: 5000 } }),
    ]));
    expect(early.body.locked).toBe(false); expect(late.body.locked).toBe(false); expect(vi.getTimerCount()).toBe(0);
  });
  it('preserves a provider failure while the other lane expires successfully', async () => {
    await setup(['failed', 'waiting']); const failed = bodyFixture(); const waiting = bodyFixture(); installBodies(failed, waiting); await start();
    await advance(1000); await emit(failed, { type: 'error', message: 'Fixture provider error' });
    await advance(4000);
    expect(history()[0].lanes).toEqual(expect.arrayContaining([
      expect.objectContaining({ modelId: 'failed', status: 'failed', errorCode: 'provider_error' }),
      expect.objectContaining({ modelId: 'waiting', status: 'completed', outputTokens: 0 }),
    ]));
    expect(vi.getTimerCount()).toBe(0);
  });
  it('clears the deadline on early natural completion without aborting the request', async () => {
    await setup(); const fixture = bodyFixture(); installBodies(fixture); await start(); await advance(1000);
    await emit(fixture, { type: 'metrics', data: providerMetrics });
    await act(async () => { fixture.close(); }); await settle();
    expect(history()).toHaveLength(1); expect(requests[0].aborted).toBe(false); expect(vi.getTimerCount()).toBe(0);
    await advance(10000); expect(requests[0].aborted).toBe(false); expect(history()).toHaveLength(1);
  });
  it('does not turn a transport AbortError into successful limit completion', async () => {
    await setup(); const fixture = bodyFixture(); installBodies(fixture); await start();
    await act(async () => { fixture.error(new DOMException('Provider aborted unexpectedly', 'AbortError')); }); await settle();
    expect(history()[0].lanes[0].status).toBe('failed');
    expect(history()[0].lanes[0].timingSource).not.toBe('browser-synthetic');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('resets a finished trial and completes a new run without an old timer firing', async () => {
    await setup(); const old = bodyFixture(); const fresh = bodyFixture(); installBodies(old, fresh); await start(); await advance(5000);
    reset(); await settle(); expect(requests[0].aborted).toBe(true); expect(history()).toHaveLength(1); expect(vi.getTimerCount()).toBe(0);
    await start(); await advance(4000); expect(history()).toHaveLength(1);
    await advance(1000); expect(history()).toHaveLength(2); expect(history()[0].lanes[0].browser.totalMs).toBe(5000);
    expect(old.body.locked).toBe(false); expect(fresh.body.locked).toBe(false); expect(vi.getTimerCount()).toBe(0);
  });
  it('cancels on unmount without saving a successful receipt or leaving a timer', async () => {
    await setup(); const fixture = bodyFixture(); installBodies(fixture); await start(); await advance(1000);
    view!.unmount(); view = undefined; await settle();
    expect(requests[0].aborted).toBe(true); expect(fixture.body.locked).toBe(false); expect(vi.getTimerCount()).toBe(0);
    await advance(10000); expect(history()).toHaveLength(0);
  });
  it('never starts a cancelled countdown after unmount', async () => {
    await setup(['fixture-model'], false); const fixture = bodyFixture(); installBodies(fixture); await start();
    await advance(700); view!.unmount(); view = undefined; await settle(); await advance(5000);
    expect(fetch).not.toHaveBeenCalled(); expect(history()).toHaveLength(0); expect(vi.getTimerCount()).toBe(0);
  });
  it('uses observed completion time when a silent-stream deadline callback is delayed', async () => {
    await setup(); const fixture = bodyFixture(); installBodies(fixture); await start();
    vi.spyOn(performance, 'now').mockReturnValue(7000);
    await advance(5000);
    expect(history()[0].lanes[0].browser.totalMs).toBe(7000);
    const metrics = rendered.results[0].metrics!;
    expect(metrics.finishTime! - metrics.startTime).toBe(7000);
    expect(fixture.cancel).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
  });
  it('shares the cutoff even when a second transport response arrives later', async () => {
    await setup(['early', 'delayed-response']);
    const early = bodyFixture(); const delayed = bodyFixture();
    let respond!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => {
      requests.push(init.signal as AbortSignal);
      return requests.length === 1 ? Promise.resolve(new Response(early.body)) : new Promise<Response>(resolve => { respond = resolve; });
    }));
    await start(); await advance(3000);
    await act(async () => { respond(new Response(delayed.body)); }); await settle();
    await emit(delayed, { type: 'chunk', content: 'late start' }); await advance(2000);
    expect(history()[0].lanes.map(lane => lane.browser.totalMs)).toEqual([5000, 5000]);
    expect(history()[0].lanes[1].browser.ttftMs).toBe(3000);
    expect(early.body.locked).toBe(false); expect(delayed.body.locked).toBe(false);
  });
  it('rejects a delayed body response after the request was already deadline-aborted', async () => {
    await setup(); const fixture = bodyFixture();
    let respond!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => {
      requests.push(init.signal as AbortSignal);
      return new Promise<Response>(resolve => { respond = resolve; });
    }));
    await start(); await advance(5000); expect(requests[0].aborted).toBe(true);
    await advance(2000);
    await act(async () => { respond(new Response(fixture.body)); }); await settle();
    expect(history()[0].lanes[0]).toMatchObject({ outputTokens: 0, browser: { totalMs: 7000 } });
    expect(fixture.cancel).toHaveBeenCalledTimes(1); expect(fixture.body.locked).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('clears the deadline when the only lane fails, preserving the failure', async () => {
    await setup(); const fixture = bodyFixture(); installBodies(fixture); await start();
    await advance(1000); await emit(fixture, { type: 'error', message: 'Fixture failure' });
    expect(history()[0].lanes[0]).toMatchObject({ status: 'failed', errorCode: 'provider_error', browser: { totalMs: 1000 } });
    expect(requests[0].aborted).toBe(false); expect(vi.getTimerCount()).toBe(0);
    await advance(5000); expect(history()).toHaveLength(1); expect(requests[0].aborted).toBe(false);
  });
  it.each(['Drag Race', 'Free Run'])('does not apply a Time Trial deadline in %s mode', async mode => {
    await setup(); click(button(mode)); const fixture = bodyFixture(); installBodies(fixture); await start();
    await advance(6000); expect(history()).toHaveLength(0); expect(requests[0].aborted).toBe(false);
    await emit(fixture, { type: 'metrics', data: providerMetrics });
    await act(async () => { fixture.close(); }); await settle();
    expect(history()[0].lanes[0]).toMatchObject({ outputTokens: 40, timingSource: 'edge-measured', browser: { totalMs: 6000 } });
    expect(vi.getTimerCount()).toBe(0);
  });
  it('retains Token Sprint whole-event counting and early reader cancellation', async () => {
    await setup(); click(button('Token Sprint')); inputValue(view!.container.querySelector('#race-token-limit')!, '50');
    const fixture = bodyFixture(); installBodies(fixture); await start(); await advance(1000);
    await act(async () => { for (let i = 0; i < 51; i++) fixture.emit({ type: 'chunk', content: 'x' }); }); await settle();
    expect(history()[0].lanes[0]).toMatchObject({ outputTokens: 50, timingSource: 'browser-synthetic', browser: { totalMs: 1000 } });
    expect(rendered.results[0].responseText).toBe('x'.repeat(50));
    expect(fixture.cancel).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
  });

  it('finishes a deadline race even when underlying reader cancellation never settles', async () => {
    await setup(); const fixture = bodyFixture(() => new Promise<void>(() => {})); installBodies(fixture); await start();
    await advance(5000);
    expect(history()).toHaveLength(1);
    expect(history()[0].lanes[0]).toMatchObject({ outputTokens: 0, browser: { totalMs: 5000 }, status: 'completed' });
    expect(fixture.cancel).toHaveBeenCalledTimes(1); expect(fixture.body.locked).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('interrupts cleanup that began before the deadline when a DONE sentinel canceller hangs', async () => {
    await setup(); const fixture = bodyFixture(() => new Promise<void>(() => {})); installBodies(fixture); await start();
    await advance(1000); await act(async () => { fixture.done(); }); await settle();
    expect(fixture.cancel).toHaveBeenCalledTimes(1); expect(history()).toHaveLength(0);
    await advance(4000);
    expect(history()).toHaveLength(1);
    expect(history()[0].lanes[0]).toMatchObject({ outputTokens: 0, browser: { totalMs: 5000 }, status: 'completed' });
    expect(fixture.body.locked).toBe(false); expect(vi.getTimerCount()).toBe(0);
  });

  it.each([false, true])('retains a known HTTP failure when reading its diagnostic body reaches the deadline (transport aborts=%s)', async nativeAbort => {
    await setup(); const fixture = bodyFixture();
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      const signal = init.signal!; requests.push(signal);
      if (nativeAbort) signal.addEventListener('abort', () => fixture.error(new DOMException('Request aborted', 'AbortError')), { once: true });
      return new Response(fixture.body, { status: 500 });
    }));
    await start(); await advance(5000);
    expect(history()).toHaveLength(1);
    expect(history()[0].lanes[0]).toMatchObject({ status: 'failed', errorCode: 'provider_error' });
    expect(rendered.results[0].error).toContain('API Error (500)');
    expect(fixture.body.locked).toBe(false); expect(vi.getTimerCount()).toBe(0);
  });

  it('records each accepted event with the same monotonic instant used for its cutoff check', async () => {
    await setup(); const fixture = bodyFixture(); installBodies(fixture); await start();
    vi.spyOn(performance, 'now').mockReturnValueOnce(4999).mockReturnValue(5001);
    await emit(fixture, { type: 'chunk', content: 'just before' });
    await act(async () => { fixture.close(); }); await settle();
    expect(history()[0].lanes[0]).toMatchObject({ outputTokens: 1, browser: { ttftMs: 4999, totalMs: 5001 } });
  });

});
