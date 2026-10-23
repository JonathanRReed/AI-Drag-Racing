// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ResultsDisplay, { type ResultState } from '../components/main/ResultsDisplay';
import type { RaceLaneProps } from '../components/main/RaceLane';
import { click, mount } from './reactDom';

const { renderLane } = vi.hoisted(() => ({ renderLane: vi.fn() }));
vi.mock('../components/main/RaceLane', () => ({
  default: (props: RaceLaneProps) => {
    renderLane(props);
    return <div data-lane={props.modelName}>{props.responseText}{props.error}</div>;
  },
}));
vi.mock('../components/layout/GlassCard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

let view: ReturnType<typeof mount> | undefined;
const result = (overrides: Partial<ResultState> = {}): ResultState => ({
  id: 'openai-test', providerName: 'openai', modelName: 'test', responseText: 'Hello',
  metrics: null, isLoading: true, error: null, browserTiming: null, edgeRegion: null,
  ...overrides,
});
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); renderLane.mockClear(); });
afterEach(() => { view?.unmount(); view = undefined; document.body.innerHTML = ''; vi.unstubAllGlobals(); });

describe('ResultsDisplay memoization', () => {
  it('supports empty, populated, and empty transitions', () => {
    view = mount(<ResultsDisplay results={[]} />);
    expect(view.container.textContent).toContain('Line up your racers');
    view.rerender(<ResultsDisplay results={[result()]} />);
    expect(view.container.textContent).toBe('Hello');
    view.rerender(<ResultsDisplay results={[]} />);
    expect(view.container.textContent).toContain('Line up your racers');
  });

  it('passes immutable streaming, metrics, and error updates to lanes', () => {
    const first = result();
    view = mount(<ResultsDisplay results={[first]} />);
    const metrics = { startTime: 1000, firstTokenTime: 1100, finishTime: 1200, tokenCount: 2 };
    view.rerender(<ResultsDisplay results={[{ ...first, responseText: 'Hello world', metrics, isLoading: false, error: 'Stopped' }]} />);
    expect(renderLane.mock.lastCall?.[0]).toMatchObject({ responseText: 'Hello world', metrics, isLoading: false, error: 'Stopped' });
  });

  it('responds to filtering changes with a stable array and new failures', () => {
    const results = [result(), result({ id: 'failed', modelName: 'failed', error: 'Unavailable' })];
    view = mount(<ResultsDisplay results={results} />);
    expect(view.container.querySelectorAll('[data-lane]')).toHaveLength(2);
    view.rerender(<ResultsDisplay results={results} hideFailed />);
    expect(view.container.querySelectorAll('[data-lane]')).toHaveLength(1);
    view.rerender(<ResultsDisplay results={results} hideFailed={false} />);
    expect(view.container.querySelectorAll('[data-lane]')).toHaveLength(2);
    view.rerender(<ResultsDisplay results={results.map(r => ({ ...r, error: 'Unavailable' }))} hideFailed />);
    expect(view.container.querySelectorAll('[data-lane]')).toHaveLength(0);
  });

  it('skips grid reconciliation when all props remain unchanged', () => {
    const results = [result()];
    view = mount(<ResultsDisplay results={results} />);
    expect(renderLane).toHaveBeenCalledTimes(1);
    view.rerender(<ResultsDisplay results={results} />);
    expect(renderLane).toHaveBeenCalledTimes(1);
  });

  it('propagates new force controls and compact mode with the same results', () => {
    const results = [result()];
    view = mount(<ResultsDisplay results={results} force={{ version: 1, collapsed: true }} />);
    const force = { version: 2, collapsed: false };
    view.rerender(<ResultsDisplay results={results} force={force} compact />);
    expect(renderLane.mock.lastCall?.[0]).toMatchObject({ force, initialExpanded: false });
  });

  it('uses the latest demo callback', () => {
    const results: ResultState[] = [];
    const oldDemo = vi.fn();
    const newDemo = vi.fn();
    view = mount(<ResultsDisplay results={results} onDemo={oldDemo} />);
    view.rerender(<ResultsDisplay results={results} onDemo={newDemo} />);
    click(view.container.querySelector('button')!);
    expect(newDemo).toHaveBeenCalledOnce();
    expect(oldDemo).not.toHaveBeenCalled();
  });
});
