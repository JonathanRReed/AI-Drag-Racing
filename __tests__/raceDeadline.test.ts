import { getEventListeners } from 'node:events';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createRaceDeadline, waitForRaceDelay } from '../utils/raceDeadline';

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout'] }); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

it('uses the supplied shared Go instant and releases its timer and parent listener', async () => {
  await vi.advanceTimersByTimeAsync(1000);
  const parent = new AbortController();
  const deadline = createRaceDeadline(performance.now(), 5000, parent.signal);
  expect(getEventListeners(parent.signal, 'abort')).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(4999); expect(deadline.signal.aborted).toBe(false);
  await vi.advanceTimersByTimeAsync(1); expect(deadline.signal.aborted).toBe(true);
  expect(deadline.isLimitError(deadline.signal.reason)).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
  deadline.dispose(); expect(getEventListeners(parent.signal, 'abort')).toHaveLength(0);
});

it('does not classify a manual abort as a time limit, even after the cutoff passes', async () => {
  const parent = new AbortController();
  const deadline = createRaceDeadline(performance.now(), 5000, parent.signal);
  parent.abort();
  await vi.advanceTimersByTimeAsync(10000);
  expect(deadline.signal.reason).toBe(parent.signal.reason);
  expect(deadline.reached()).toBe(false);
  expect(deadline.isLimitError(parent.signal.reason)).toBe(false);
  expect(vi.getTimerCount()).toBe(0);
  expect(getEventListeners(parent.signal, 'abort')).toHaveLength(0);
  deadline.dispose();
});

it('does not leave a listener or timer for an already-cancelled parent', () => {
  const parent = new AbortController(); parent.abort();
  const deadline = createRaceDeadline(performance.now(), 5000, parent.signal);
  expect(deadline.signal.aborted).toBe(true);
  deadline.dispose();
  expect(getEventListeners(parent.signal, 'abort')).toHaveLength(0);
  expect(vi.getTimerCount()).toBe(0);
});

it('retires an early-finished deadline without aborting its completed request later', async () => {
  const parent = new AbortController();
  const deadline = createRaceDeadline(performance.now(), 5000, parent.signal);
  deadline.dispose(); await vi.advanceTimersByTimeAsync(10000);
  expect(deadline.signal.aborted).toBe(false);
  expect(getEventListeners(parent.signal, 'abort')).toHaveLength(0);
  expect(vi.getTimerCount()).toBe(0);
});

it.each(['normal', 'cancel', 'already-cancelled'])('cleans up a %s countdown wait', async mode => {
  const parent = new AbortController();
  if (mode === 'already-cancelled') parent.abort();
  const done = vi.fn();
  const waiting = waitForRaceDelay(700, parent.signal).then(done);
  if (mode === 'cancel') parent.abort();
  if (mode === 'normal') await vi.advanceTimersByTimeAsync(700);
  await waiting;
  expect(done).toHaveBeenCalledTimes(1);
  expect(getEventListeners(parent.signal, 'abort')).toHaveLength(0);
  expect(vi.getTimerCount()).toBe(0);
});
