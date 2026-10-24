// @vitest-environment happy-dom
import React, { act } from 'react';
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { mount, click } from './reactDom';
import RaceLane, { type RaceLaneProps } from '../components/main/RaceLane';
import type { CompletionMetrics } from '../utils/providerService';
import ResultsDisplay, { type ResultState } from '../components/main/ResultsDisplay';

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

describe('expanded race telemetry', () => {
  test('makes TTFT and TPS meanings available with the unchanged measured values, without hover', () => {
    view = mount(lane());
    const explanation = [...view.container.querySelectorAll('p')].find(node => node.textContent?.includes('TTFT:'));
    expect(explanation).toBeDefined();
    expect(explanation!.textContent).toContain('TTFT: time to first token.');
    expect(explanation!.textContent).toContain('TPS: output tokens per second.');
    expect(explanation!.classList.contains('sr-only')).toBe(false);
    expect(explanation!.hidden).toBe(false);
    const telemetry = explanation!.parentElement!;
    expect(telemetry.classList.contains('hidden')).toBe(false);
    expect(telemetry.textContent).toContain('200 ms');
    expect(telemetry.textContent).toContain('1000 ms');
    expect(telemetry.textContent).toContain('12.50');
    expect(explanation!.querySelector('[tabindex]')).toBeNull();
    click(view.container.querySelector('[aria-label="Collapse OpenAI response"]')!);
    expect(telemetry.classList.contains('hidden')).toBe(true);
    click(view.container.querySelector('[aria-label="Expand OpenAI response"]')!);
    expect(telemetry.classList.contains('hidden')).toBe(false);
    expect(telemetry.textContent).toContain('12.50');
  });
});

describe('RaceLane timing boundaries', () => {
  const timing = (label: string) => [...view!.container.querySelectorAll('span')]
    .find(node => node.textContent === label)?.nextElementSibling?.textContent;

  test.each([
    { name: 'zero timestamps', startTime: 0, firstTokenTime: 0, finishTime: 0, ttft: '0 ms', total: '0 ms' },
    { name: 'equal nonzero timestamps', startTime: 1000, firstTokenTime: 1000, finishTime: 1000, ttft: '0 ms', total: '0 ms' },
    { name: 'zero first-token timestamp', startTime: 0, firstTokenTime: 0, finishTime: 200, ttft: '0 ms', total: '200 ms' },
    { name: 'missing first-token timestamp', startTime: 1000, firstTokenTime: undefined, finishTime: 2000, ttft: 'N/A', total: '1000 ms' },
    { name: 'wall-clock rollback', startTime: 1000, firstTokenTime: 900, finishTime: 500, ttft: 'N/A', total: 'N/A' },
    { name: 'reversed first-token interval only', startTime: 1000, firstTokenTime: 900, finishTime: 2000, ttft: 'N/A', total: '1000 ms' },
    { name: 'reversed total interval only', startTime: 1000, firstTokenTime: 1200, finishTime: 500, ttft: '200 ms', total: 'N/A' },
    { name: 'infinite start', startTime: Infinity, firstTokenTime: 1200, finishTime: 2000, ttft: 'N/A', total: 'N/A' },
    { name: 'negative infinite start', startTime: -Infinity, firstTokenTime: 1200, finishTime: 2000, ttft: 'N/A', total: 'N/A' },
    { name: 'NaN start', startTime: NaN, firstTokenTime: 1200, finishTime: 2000, ttft: 'N/A', total: 'N/A' },
    { name: 'infinite first-token timestamp', startTime: 1000, firstTokenTime: Infinity, finishTime: 2000, ttft: 'N/A', total: '1000 ms' },
    { name: 'negative infinite first-token timestamp', startTime: 1000, firstTokenTime: -Infinity, finishTime: 2000, ttft: 'N/A', total: '1000 ms' },
    { name: 'NaN first-token timestamp', startTime: 1000, firstTokenTime: NaN, finishTime: 2000, ttft: 'N/A', total: '1000 ms' },
    { name: 'infinite finish', startTime: 1000, firstTokenTime: 1200, finishTime: Infinity, ttft: '200 ms', total: 'N/A' },
    { name: 'negative infinite finish', startTime: 1000, firstTokenTime: 1200, finishTime: -Infinity, ttft: '200 ms', total: 'N/A' },
    { name: 'NaN finish', startTime: 1000, firstTokenTime: 1200, finishTime: NaN, ttft: '200 ms', total: 'N/A' },
    { name: 'overflow from finite timestamps', startTime: -Number.MAX_VALUE, firstTokenTime: Number.MAX_VALUE, finishTime: Number.MAX_VALUE, ttft: 'N/A', total: 'N/A' },
  ])('$name preserves available durations without inventing invalid ones', ({ startTime, firstTokenTime, finishTime, ttft, total }) => {
    view = mount(lane({ metrics: { ...METRICS, startTime, firstTokenTime, finishTime } }));
    expect(timing('TTFT')).toBe(ttft);
    expect(timing('Total')).toBe(total);
  });

  test('missing metrics leave both durations unavailable', () => {
    view = mount(lane({ metrics: null }));
    expect(timing('TTFT')).toBe('N/A');
    expect(timing('Total')).toBe('N/A');
  });
});

test('does not substitute total input plus output when output usage is missing', () => {
  view = mount(lane({ metrics: { ...METRICS, outputTokens: undefined, inputTokens: 999970, tokenCount: 1000000 } }));
  const explanation = [...view.container.querySelectorAll('p')].find(node => node.textContent?.includes('TTFT:'))!;
  expect(explanation.textContent).toContain('TPS: output tokens per second.');
  expect(explanation.parentElement!.textContent).toContain('TPSN/A');
  expect(explanation.parentElement!.textContent).toContain('Not available');
});

describe('RaceLane response expansion', () => {
  const toggle = () => view!.container.querySelector<HTMLButtonElement>('button[aria-expanded]')!;
  const expectExpanded = (expanded: boolean) => {
    expect(toggle().getAttribute('aria-expanded')).toBe(String(expanded));
    const response = view!.container.querySelector('.overflow-y-auto')!;
    expect(response.classList.contains('max-h-0')).toBe(!expanded);
  };
  const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
  const initialForce = { version: 0, collapsed: false };

  test('automatically collapses an untouched response six seconds after finishing', () => {
    view = mount(lane({ metrics: null, isLoading: true, force: initialForce }));
    advance(9000);
    expectExpanded(true);
    view.rerender(lane({ force: initialForce }));
    advance(5999);
    expectExpanded(true);
    advance(1);
    expectExpanded(false);
  });

  test('keeps a manually reopened finished response expanded', () => {
    view = mount(lane());
    advance(6000);
    expectExpanded(false);
    click(toggle());
    advance(12000);
    expectExpanded(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  test('manual collapse and re-expansion cancel the pending finish collapse', () => {
    view = mount(lane());
    advance(3000);
    click(toggle());
    expectExpanded(false);
    click(toggle());
    advance(3000);
    expectExpanded(true);
    advance(9000);
    expectExpanded(true);
  });

  test.each([3000, 7000])('Expand All keeps finished responses open when issued after %i ms', elapsed => {
    view = mount(lane({ force: initialForce }));
    advance(elapsed);
    view.rerender(lane({ force: { version: 1, collapsed: false } }));
    expectExpanded(true);
    advance(12000);
    expectExpanded(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  test('manual collapse survives more streamed chunks and completion', () => {
    view = mount(lane({ metrics: null, isLoading: true }));
    click(toggle());
    expectExpanded(false);
    view.rerender(lane({ responseText: 'More streamed text', metrics: null, isLoading: true }));
    expectExpanded(false);
    view.rerender(lane({ responseText: 'More streamed text' }));
    advance(12000);
    expectExpanded(false);
  });

  test('Collapse All survives streaming, and a later Expand All remains open after finish', () => {
    view = mount(lane({ metrics: null, isLoading: true, force: initialForce }));
    const collapse = { version: 1, collapsed: true };
    view.rerender(lane({ metrics: null, isLoading: true, force: collapse }));
    expectExpanded(false);
    view.rerender(lane({ responseText: 'More streamed text', metrics: null, isLoading: true, force: collapse }));
    expectExpanded(false);
    const expand = { version: 2, collapsed: false };
    view.rerender(lane({ metrics: null, isLoading: true, force: expand }));
    expectExpanded(true);
    view.rerender(lane({ force: expand }));
    advance(12000);
    expectExpanded(true);
  });

  test('a manual choice while waiting for the first chunk is respected', () => {
    view = mount(lane({ responseText: '', metrics: null, isLoading: true }));
    click(toggle());
    view.rerender(lane({ metrics: null, isLoading: true }));
    expectExpanded(false);
    view.rerender(lane());
    advance(12000);
    expectExpanded(false);
  });

  test('a new run clears the manual choice and gets its own finish timer', () => {
    view = mount(lane());
    click(toggle());
    view.rerender(lane({ responseText: '', metrics: null, isLoading: true }));
    view.rerender(lane({ responseText: 'Second response', metrics: null, isLoading: true }));
    expectExpanded(true);
    view.rerender(lane({ responseText: 'Second response', metrics: { ...METRICS, startTime: 5000, finishTime: 6000 } }));
    advance(5999);
    expectExpanded(true);
    advance(1);
    expectExpanded(false);
  });

  test('a new run cancels the previous finish timer before it can hide streaming text', () => {
    view = mount(lane());
    advance(3000);
    view.rerender(lane({ responseText: '', metrics: null, isLoading: true }));
    view.rerender(lane({ responseText: 'Second response', metrics: null, isLoading: true }));
    advance(12000);
    expectExpanded(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  test('an unchanged broadcast version does not override a later per-lane choice', () => {
    view = mount(lane({ force: initialForce }));
    view.rerender(lane({ force: { version: 1, collapsed: false } }));
    click(toggle());
    view.rerender(lane({ force: { version: 1, collapsed: false } }));
    advance(12000);
    expectExpanded(false);
  });

  test('unmount clears the finish timer', () => {
    view = mount(lane());
    expect(vi.getTimerCount()).toBe(1);
    view.unmount();
    view = undefined;
    expect(vi.getTimerCount()).toBe(0);
  });

  test('an interrupted completion cancels the timer and leaves error details open', () => {
    view = mount(lane());
    advance(3000);
    view.rerender(lane({ error: 'Stream interrupted' }));
    advance(12000);
    expectExpanded(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});


test('ResultsDisplay Reset retires lane choices and old timers before the next run', () => {
  const results: ResultState[] = ['openai', 'groq'].map(providerName => ({
    id: `${providerName}-model`, providerName, modelName: 'model', responseText: 'Completed response',
    metrics: METRICS, isLoading: false, error: null, browserTiming: null, edgeRegion: null,
  }));
  const force = { version: 0, collapsed: false };
  const toggles = () => [...view!.container.querySelectorAll('button[aria-expanded]')];
  const expanded = () => toggles().map(button => button.getAttribute('aria-expanded'));
  view = mount(<ResultsDisplay results={results} force={force} />);
  act(() => { vi.advanceTimersByTime(3000); });
  click(toggles()[0] as HTMLButtonElement);
  const expandAll = { version: 1, collapsed: false };
  view.rerender(<ResultsDisplay results={results} force={expandAll} />);
  act(() => { vi.advanceTimersByTime(12000); });
  expect(expanded()).toEqual(['true', 'true']);

  // Home Reset clears results, but intentionally retains the toolbar's version.
  view.rerender(<ResultsDisplay results={[]} force={expandAll} />);
  expect(toggles()).toHaveLength(0);
  expect(vi.getTimerCount()).toBe(0);
  const staged = results.map(result => ({ ...result, responseText: '', metrics: null, isLoading: true }));
  view.rerender(<ResultsDisplay results={staged} force={expandAll} />);
  view.rerender(<ResultsDisplay results={results} force={expandAll} />);
  act(() => { vi.advanceTimersByTime(5999); });
  expect(expanded()).toEqual(['true', 'true']);
  act(() => { vi.advanceTimersByTime(1); });
  expect(expanded()).toEqual(['false', 'false']);
});
