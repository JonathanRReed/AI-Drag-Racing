// @vitest-environment happy-dom
import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SharedRacePage from '../pages/share/[id]';
import { getRaceShare, type RaceShareRecord } from '../utils/raceShares';
import { mount } from './reactDom';

const { router, observeStateWrite } = vi.hoisted(() => ({
  router: { isReady: true, query: { id: undefined as string | string[] | undefined } },
  observeStateWrite: vi.fn(),
}));

vi.mock('next/router', () => ({ useRouter: () => router }));
vi.mock('next/head', () => ({ default: () => null }));
vi.mock('../components/layout/SiteChrome', () => ({
  SiteHeader: () => null,
  SiteFooter: () => null,
}));
vi.mock('../utils/raceShares', () => ({ getRaceShare: vi.fn() }));

// Real React state still drives the real page and SharedRaceView. Observe dispatch
// attempts only to make the unmount guard test meaningful: React 19 silently
// ignores post-unmount dispatches, so checking an empty DOM would miss that bug.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  const setters = new WeakMap<object, unknown>();
  return {
    ...actual,
    useState<S>(initialState: S | (() => S)) {
      const [value, setValue] = actual.useState(initialState);
      let tracked = setters.get(setValue) as typeof setValue | undefined;
      if (!tracked) {
        tracked = (next) => { observeStateWrite(next); setValue(next); };
        setters.set(setValue, tracked);
      }
      return [value, tracked];
    },
  };
});

const ID_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ID_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
type Outcome = 'record' | 'missing' | 'error';
let view: ReturnType<typeof mount> | undefined;

function deferred() {
  let resolve!: (record: RaceShareRecord | null) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<RaceShareRecord | null>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function record(modelId: string): RaceShareRecord {
  return {
    expiresAt: '2026-11-24T12:00:00.000Z',
    payload: {
      schemaVersion: 'ai-drag-race-share.v1',
      createdAt: '2026-10-24T12:00:00.000Z',
      experience: 'quick',
      mode: 'drag',
      prompt: { characters: 10 },
      environment: { edgeRegion: 'test', userAgentFamily: null },
      settings: { temperature: 0.7, maxTokens: 512, topP: 1, repetitions: 1, concurrency: 1 },
      lanes: [{
        providerId: 'test-provider', modelId,
        browser: { ttftMs: 100, totalMs: 200 },
        edge: { ttftMs: 90, totalMs: 180 },
        inputTokens: 2, outputTokens: 5,
        tokenSource: 'provider-reported', timingSource: 'browser-measured',
        status: 'completed', errorCode: null,
      }],
    },
  };
}

async function settle(request: ReturnType<typeof deferred>, outcome: Outcome, modelId = 'receipt-A') {
  await act(async () => {
    if (outcome === 'error') request.reject(new Error('Share unavailable'));
    else request.resolve(outcome === 'missing' ? null : record(modelId));
    await request.promise.catch(() => undefined);
  });
}

function start() {
  const a = deferred();
  const b = deferred();
  vi.mocked(getRaceShare).mockImplementation((id) => {
    if (id === ID_A) return a.promise;
    if (id === ID_B) return b.promise;
    throw new Error(`Unexpected receipt ID: ${id}`);
  });
  view = mount(<SharedRacePage />);
  return { a, b };
}

function navigateToB() {
  router.query.id = ID_B;
  view!.rerender(<SharedRacePage />);
  expect(vi.mocked(getRaceShare).mock.calls).toEqual([[ID_A], [ID_B]]);
}

function expectLoading() {
  const message = view!.container.querySelector('.shared-race-message');
  expect(message?.getAttribute('aria-live')).toBe('polite');
  expect(message?.querySelector('h1')?.textContent).toBe('Loading race receipt');
  expect(message?.querySelector('p')?.textContent).toBe('Checking the 30-day share store.');
  expect(message?.querySelector('a')).toBeNull();
  expect(view!.container.querySelector('.shared-race')).toBeNull();
}

function expectReceipt(modelId: string) {
  expect(view!.container.querySelector('.shared-race-message')).toBeNull();
  expect(view!.container.querySelector('h1')?.textContent).toBe('AI Drag Racing result');
  expect(view!.container.querySelector('tbody th strong')?.textContent).toBe(modelId);
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  // Even an accidental use of the real service cannot issue a request.
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Network is forbidden in this test'); }));
  router.isReady = true;
  router.query.id = ID_A;
  vi.mocked(getRaceShare).mockReset();
  observeStateWrite.mockClear();
});

afterEach(() => {
  view?.unmount();
  view = undefined;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('SharedRacePage receipt request ownership', () => {
  it.each([
    { isReady: false, id: ID_A },
    { isReady: true, id: undefined },
    { isReady: true, id: [ID_A, ID_B] },
  ])('waits for a ready, scalar route ID: %j', ({ isReady, id }) => {
    router.isReady = isReady;
    router.query.id = id;
    start();
    expectLoading();
    expect(getRaceShare).not.toHaveBeenCalled();
    router.isReady = true;
    router.query.id = ID_A;
    view!.rerender(<SharedRacePage />);
    expect(getRaceShare).toHaveBeenCalledExactlyOnceWith(ID_A);
  });

  it.each<Outcome>(['record', 'missing', 'error'])('resets a settled %s to loading immediately on A → B', async (outcome) => {
    const { a, b } = start();
    expectLoading();
    await settle(a, outcome);
    if (outcome === 'record') expectReceipt('receipt-A');
    else {
      const message = view!.container.querySelector('.shared-race-message');
      expect(message?.getAttribute('aria-live')).toBe('polite');
      expect(message?.querySelector('h1')?.textContent).toBe('Race receipt unavailable');
      expect(message?.querySelector('p')?.textContent).toBe(outcome === 'missing'
        ? 'This unlisted link is invalid or has expired.'
        : 'The receipt could not be loaded. Try again shortly.');
      expect(message?.querySelector('a')?.getAttribute('href')).toBe('/');
      expect(message?.querySelector('a')?.textContent).toBe('Start a new race');
    }
    navigateToB();
    // No promise settlement or elapsed time between navigation and this assertion.
    expectLoading();
    await settle(b, 'record', 'receipt-B');
    expectReceipt('receipt-B');
  });

  it.each<Outcome>(['record', 'missing', 'error'])('ignores stale A %s while B is pending, then shows B', async (outcome) => {
    const { a, b } = start();
    navigateToB();
    await settle(a, outcome);
    expectLoading();
    await settle(b, 'record', 'receipt-B');
    expectReceipt('receipt-B');
  });

  it.each<Outcome>(['record', 'missing', 'error'])('ignores stale A %s after B has resolved', async (outcome) => {
    const { a, b } = start();
    navigateToB();
    await settle(b, 'record', 'receipt-B');
    expectReceipt('receipt-B');
    await settle(a, outcome);
    expectReceipt('receipt-B');
  });

  it.each<Outcome>(['record', 'missing', 'error'])('does not dispatch a late %s after unmount', async (outcome) => {
    const { a } = start();
    view!.unmount();
    view = undefined;
    observeStateWrite.mockClear();
    await settle(a, outcome);
    expect(observeStateWrite).not.toHaveBeenCalled();
  });
});
