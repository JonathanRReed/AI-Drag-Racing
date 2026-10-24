// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ComparisonCharts from '../components/ComparisonCharts';
import { type ResultState } from '../components/main/ResultsDisplay';
import { getProviderColor } from '../utils/providerColors';
import { click, mount } from './reactDom';

const { chartRender } = vi.hoisted(() => ({ chartRender: vi.fn() }));
vi.mock('react-chartjs-2', () => ({ Bar: (props: any) => {
  chartRender(props);
  return <div data-testid="chart" data-values={JSON.stringify(props.data.datasets[0].data)} />;
} }));
vi.mock('../utils/providerColors', async importOriginal => {
  const actual = await importOriginal<typeof import('../utils/providerColors')>();
  return { ...actual, getProviderColor: vi.fn(actual.getProviderColor) };
});
let view: ReturnType<typeof mount>;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.clearAllMocks(); });
afterEach(() => { view?.unmount(); document.body.innerHTML = ''; vi.unstubAllGlobals(); });
function result(id: string, firstTokenTime: number, finishTime: number, outputTokens?: number): ResultState {
  return { id, providerName: id, modelName: 'long-model-name-that-needs-an-ellipsis', responseText: 'test',
    metrics: { startTime: 100, firstTokenTime, finishTime, tokenCount: 20, outputTokens },
    error: null, isLoading: false, browserTiming: null, edgeRegion: null };
}
const fixtures = [result('OpenAI', 200, 600, 100), result('Anthropic', 400, 1100, 200),
  { ...result('Groq', 150, 700), isLoading: true }, { ...result('Cohere', 180, 800), error: 'failed' }];
const charts = () => chartRender.mock.calls.slice(-4).map(call => call[0]);

describe('comparison charts', () => {
  it('sorts all four metrics together with provider colors and full tooltip labels', () => {
    view = mount(<ComparisonCharts results={fixtures} />);
    const [latency, tps, ttft, tokens] = charts();
    expect(latency.data.datasets[0].data).toEqual([1000, 500]);
    expect(ttft.data.datasets[0].data).toEqual([300, 100]);
    expect(tokens.data.datasets[0].data).toEqual([200, 100]);
    expect(tps.data.datasets[0].data).toEqual([200 / .7, 100 / .4]);
    expect(view.container.querySelector('[aria-label="Chart model identifiers"]')?.textContent).toContain('long-model-name-that-needs-an-ellipsis');
    for (const chart of charts()) {
      expect(chart.data.labels).toHaveLength(2);
      expect(chart.data.labels[0]).toBe('Lane 2');
      expect(chart.options.plugins.tooltip.callbacks.title([{ dataIndex: 0 }])).toEqual(['Lane 2: Anthropic (long-model-name-that-needs-an-ellipsis)']);
      expect(chart.data.datasets[0].backgroundColor[0]).toBe(getProviderColor('Anthropic').soft);
    }
    click(view.container.querySelector('button')!);
    expect(view.container.textContent).toContain('Order: Low → High');
    expect(charts()[0].data.datasets[0].data).toEqual([500, 1000]);
    expect(charts()[0].options.plugins.tooltip.callbacks.title([{ dataIndex: 0 }])).toEqual(['Lane 1: OpenAI (long-model-name-that-needs-an-ellipsis)']);
  });

  it('skips chart preparation and renders when results identity is unchanged', () => {
    view = mount(<ComparisonCharts results={fixtures} />);
    vi.mocked(getProviderColor).mockClear(); chartRender.mockClear();
    view.rerender(<ComparisonCharts results={fixtures} />);
    expect(getProviderColor).not.toHaveBeenCalled();
    expect(chartRender).not.toHaveBeenCalled();
  });

  it('updates datasets and tooltip closures when immutable results change', () => {
    view = mount(<ComparisonCharts results={fixtures} />);
    const previous = charts()[0];
    const replacement = [result('Groq', 150, 300, 80)];
    view.rerender(<ComparisonCharts results={replacement} />);
    const next = charts()[0];
    expect(next.data).not.toBe(previous.data);
    expect(next.data.datasets[0].data).toEqual([200]);
    expect(next.options.plugins.tooltip.callbacks.title([{ dataIndex: 0 }])).toEqual(['Lane 1: Groq (long-model-name-that-needs-an-ellipsis)']);
  });

  it('keeps missing token counts and throughput unavailable rather than manufacturing zero', () => {
    view = mount(<ComparisonCharts results={[result('OpenAI', 0, 500)]} />);
    const [, tps, ttft, tokens] = charts();
    expect(tps.data.datasets[0].data).toEqual([null]);
    expect(ttft.data.datasets[0].data).toEqual([null]);
    expect(tokens.data.datasets[0].data).toEqual([null]);
  });
});

describe('technical chart identifiers', () => {
  it('keeps escaped labels, numeric values and full HTML mappings aligned through sorting', () => {
    const inputs = [{ ...result('OpenAI', 200, 600, 100), modelName: 'x\u200by' }, { ...result('OpenAI', 400, 1100, 200), id: 'other', modelName: 'x\\u{200B}y' }];
    view = mount(<ComparisonCharts results={inputs} />);
    expect(charts()[0].options.plugins.tooltip.callbacks.title([{ dataIndex: 0 }])).toEqual(['Lane 2: OpenAI (x\\\\u{200B}y)']);
    expect(charts()[0].data.labels[0]).toBe('Lane 2');
    expect(charts()[0].data.datasets[0].data).toEqual([1000, 500]);
    const mapping = view.container.querySelector('[aria-label="Chart model identifiers"]')!;
    expect(mapping.textContent).toContain('Lane 1:');
    expect(mapping.textContent).toContain('Escaped representation: x\\u{200B}y');
    expect(mapping.textContent).toContain('Lane 2:');
    expect(mapping.textContent).toContain('Escaped representation: x\\\\u{200B}y');
    click(view.container.querySelector('button')!);
    expect(charts()[0].options.plugins.tooltip.callbacks.title([{ dataIndex: 0 }])).toEqual(['Lane 1: OpenAI (x\\u{200B}y)']);
    expect(charts()[0].data.datasets[0].data).toEqual([500, 1000]);
    expect(inputs.map(input => input.modelName)).toEqual(['x\u200by', 'x\\u{200B}y']);
  });
  it('preserves short ordinary Unicode charts with authored isolation only', () => {
    view = mount(<ComparisonCharts results={[{ ...result('OpenAI', 200, 600), modelName: 'مدل' }]} />);
    expect(charts()[0].options.plugins.tooltip.callbacks.title([{ dataIndex: 0 }])).toEqual(['OpenAI (\u2068مدل\u2069)']);
    expect(view.container.querySelector('[aria-label="Chart model identifiers"]')).toBeNull();
  });
});


describe('canvas isolation boundaries', () => {
  it.each([18, 19])('keeps all %i Unicode characters and both authored isolation marks for an unmapped short label', count => {
    const modelName = '模'.repeat(count);
    view = mount(<ComparisonCharts results={[{ ...result('OpenAI', 200, 600), modelName }]} />);
    expect(charts()[0].data.labels).toEqual([`OpenAI (\u2068${modelName}\u2069)`]);
    expect(view.container.querySelector('[aria-label="Chart model identifiers"]')).toBeNull();
  });
  it('uses stable lane ticks rather than slicing escapes, surrogate pairs or isolates', () => {
    const modelName = 'a'.repeat(18) + '👩' + 'suffix';
    view = mount(<ComparisonCharts results={[{ ...result('提供者', 200, 600), modelName }]} />);
    expect(charts()[0].data.labels).toEqual(['Lane 1']);
    expect(charts()[0].options.plugins.tooltip.callbacks.title([{ dataIndex: 0 }])).toEqual([`Lane 1: \u2068提供者\u2069 (\u2068${modelName}\u2069)`]);
    expect(view.container.querySelector('[aria-label="Chart model identifiers"]')?.textContent).toContain(modelName);
  });
});

describe('chart sort action semantics', () => {
  it('names the next action without pressed state and keeps current order distinct through two reversals', () => {
    view = mount(<ComparisonCharts results={fixtures} />);
    const button = view.container.querySelector('button')!;
    expect(button.textContent).toBe('Sort low to high');
    expect(button.hasAttribute('aria-pressed')).toBe(false);
    expect(button.hasAttribute('aria-label')).toBe(false);
    expect(button.parentElement!.textContent).toContain('Order: High → Low');
    click(button);
    expect(button.textContent).toBe('Sort high to low');
    expect(button.hasAttribute('aria-pressed')).toBe(false);
    expect(button.parentElement!.textContent).toContain('Order: Low → High');
    expect(charts().map(chart => chart.data.datasets[0].data)).toEqual([[500, 1000], [100 / .4, 200 / .7], [100, 300], [100, 200]]);
    click(button);
    expect(button.textContent).toBe('Sort low to high');
    expect(button.parentElement!.textContent).toContain('Order: High → Low');
    expect(charts().map(chart => chart.data.datasets[0].data)).toEqual([[1000, 500], [200 / .7, 100 / .4], [300, 100], [200, 100]]);
  });
});
