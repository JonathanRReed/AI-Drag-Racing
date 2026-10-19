// @vitest-environment happy-dom
import React, { act } from 'react';
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { mount, click } from './reactDom';
import RaceLane, { type RaceLaneProps } from '../components/main/RaceLane';
import type { CompletionMetrics } from '../utils/providerService';

let view: ReturnType<typeof mount> | undefined;

const METRICS: CompletionMetrics = { startTime: 1000, firstTokenTime: 1200, finishTime: 2000, tokenCount: 10, outputTokens: 10 };

function lane(props: Partial<RaceLaneProps> = {}) {
  return (
    <RaceLane
      providerName="openai"
      modelName="gpt-4o"
      responseText="Hello world response"
      metrics={METRICS}
      isLoading={false}
      error={null}
      {...props}
    />
  );
}

function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function stubClipboard(clipboard: unknown) {
  Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true, writable: true });
}

const COPY_LABELS: Record<string, string> = {
  'Copy OpenAI response': 'idle',
  'Copied OpenAI response': 'copied',
  'Copy failed. Retry copying OpenAI response': 'failed',
};
const copyButton = () =>
  [...view!.container.querySelectorAll<HTMLButtonElement>('button')].find((button) => (button.getAttribute('aria-label') ?? '') in COPY_LABELS);
const copyState = () => COPY_LABELS[copyButton()?.getAttribute('aria-label') ?? ''] ?? 'missing';
const status = () => view!.container.querySelector('[role="status"]')?.textContent ?? '';

async function flush() {
  await act(async () => { await Promise.resolve(); });
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.useFakeTimers();
});

afterEach(() => {
  view?.unmount();
  view = undefined;
  document.body.innerHTML = '';
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('RaceLane copy response', () => {
  test('does not show a copy button when there is no response', () => {
    view = mount(lane({ responseText: '', metrics: null }));
    expect(view.container.querySelector('button[aria-label*="Copy"]')).toBeNull();
  });

  test('confirms only after the clipboard write resolves, then clears', async () => {
    const write = deferred();
    const writeText = vi.fn(() => write.promise);
    stubClipboard({ writeText });
    view = mount(lane());

    click(copyButton()!);
    expect(writeText).toHaveBeenCalledWith('Hello world response');
    expect(copyState()).toBe('idle');

    write.resolve();
    await flush();
    expect(copyState()).toBe('copied');
    expect(copyButton()!.getAttribute('aria-label')).toBe('Copied OpenAI response');
    expect(status()).toBe('Copied OpenAI response.');

    act(() => { vi.advanceTimersByTime(2000); });
    expect(copyState()).toBe('idle');
    expect(status()).toBe('');
  });

  test('streamed text after the copy clears the confirmation', async () => {
    stubClipboard({ writeText: vi.fn().mockResolvedValue(undefined) });
    view = mount(lane({ responseText: 'Hello', isLoading: true, metrics: null }));
    click(copyButton()!);
    await flush();
    expect(copyState()).toBe('copied');

    view.rerender(lane({ responseText: 'Hello world', isLoading: true, metrics: null }));
    expect(copyState()).toBe('idle');
    expect(copyButton()!.getAttribute('aria-label')).toBe('Copy OpenAI response');
    expect(vi.getTimerCount()).toBe(0);
  });

  test('a write that resolves after a new race starts changes nothing', async () => {
    const write = deferred();
    stubClipboard({ writeText: vi.fn(() => write.promise) });
    view = mount(lane({ responseText: 'First race answer' }));
    click(copyButton()!);

    view.rerender(lane({ responseText: '', isLoading: true, metrics: null }));
    view.rerender(lane({ responseText: 'Second race answer', isLoading: true, metrics: null }));
    write.resolve();
    await flush();

    expect(copyState()).toBe('idle');
    expect(status()).toBe('');
    expect(vi.getTimerCount()).toBe(0);
  });

  test('repeated clicks: an earlier write resolving late cannot extend the confirmation', async () => {
    const first = deferred();
    const second = deferred();
    const writeText = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    stubClipboard({ writeText });
    view = mount(lane());
    // The finished lane schedules its own auto-collapse timer; only copy timers are counted.
    const laneTimers = vi.getTimerCount();

    click(copyButton()!);
    click(copyButton()!);
    expect(writeText).toHaveBeenCalledTimes(2);

    second.resolve();
    await flush();
    expect(copyState()).toBe('copied');

    act(() => { vi.advanceTimersByTime(1500); });
    first.resolve();
    await flush();
    act(() => { vi.advanceTimersByTime(600); });
    expect(copyState()).toBe('idle');
    expect(vi.getTimerCount()).toBe(laneTimers);
  });

  test('a write resolving after unmount sets no state and schedules no timer', async () => {
    const write = deferred();
    stubClipboard({ writeText: vi.fn(() => write.promise) });
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    view = mount(lane());
    click(copyButton()!);
    view.unmount();
    view = undefined;

    write.resolve();
    await act(async () => { await Promise.resolve(); });
    expect(vi.getTimerCount()).toBe(0);
    expect(errors).not.toHaveBeenCalled();
  });

  test('unmounting during the confirmation clears its timer', async () => {
    stubClipboard({ writeText: vi.fn().mockResolvedValue(undefined) });
    view = mount(lane());
    click(copyButton()!);
    await flush();
    expect(copyState()).toBe('copied');
    view.unmount();
    view = undefined;
    expect(vi.getTimerCount()).toBe(0);
  });

  test('an unavailable clipboard reports a failure', async () => {
    stubClipboard(undefined);
    view = mount(lane());
    click(copyButton()!);
    await flush();
    expect(copyState()).toBe('failed');
    expect(copyButton()!.getAttribute('aria-label')).toBe('Copy failed. Retry copying OpenAI response');
    expect(status()).toBe('Copy failed: clipboard is not available in this browser.');
  });

  test('a denied clipboard write reports a failure and a retry can succeed', async () => {
    const writeText = vi.fn()
      .mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'))
      .mockResolvedValueOnce(undefined);
    stubClipboard({ writeText });
    view = mount(lane());
    click(copyButton()!);
    await flush();
    expect(copyState()).toBe('failed');
    expect(status()).toBe('Copy failed: clipboard access was blocked.');

    click(copyButton()!);
    await flush();
    expect(copyState()).toBe('copied');
    expect(status()).toBe('Copied OpenAI response.');
  });
});

describe('RaceLane telemetry accessibility', () => {
  test('renders abbr tags for telemetry metrics with explanatory titles', () => {
    view = mount(lane());
    const ttftAbbr = view.container.querySelector('abbr[title="Time to First Token"]');
    const tpsAbbr = view.container.querySelector('abbr[title="Tokens Per Second"]');

    expect(ttftAbbr).not.toBeNull();
    expect(ttftAbbr?.textContent).toBe('TTFT');

    expect(tpsAbbr).not.toBeNull();
    expect(tpsAbbr?.textContent).toBe('TPS');
  });
});
