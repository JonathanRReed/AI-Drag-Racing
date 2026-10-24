// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RaceLane from '../components/main/RaceLane';
import ComparisonCharts from '../components/ComparisonCharts';
import type { CompletionMetrics } from '../utils/providerService';
import type { ResultState } from '../components/main/ResultsDisplay';
import { getProviderColor } from '../utils/providerColors';
import { click, mount } from './reactDom';

// Canvas rendering is external to the validity contract. Capture the real
// components' prepared data and callbacks; do not replace their calculations.
const { chartRender } = vi.hoisted(() => ({ chartRender: vi.fn() }));
vi.mock('react-chartjs-2', () => ({ Bar: (props: any) => { chartRender(props); return <div />; } }));
let view: ReturnType<typeof mount> | undefined;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); chartRender.mockClear(); });
afterEach(() => { view?.unmount(); view = undefined; vi.unstubAllGlobals(); });

const metrics = (overrides: Partial<CompletionMetrics> = {}): CompletionMetrics => ({
  startTime: 1000, firstTokenTime: 1200, finishTime: 2200,
  tokenCount: 1000, inputTokens: 900, outputTokens: 100,
  tokenCountSource: 'provider-reported', timingSource: 'edge-measured', ...overrides,
});
const result = (overrides: Partial<CompletionMetrics> = {}, id = 'OpenAI', modelName = 'fixture'): ResultState => ({
  id, providerName: id, modelName, metrics: metrics(overrides), responseText: 'Answer',
  error: null, isLoading: false, browserTiming: null, edgeRegion: null,
});
const tpsChart = () => chartRender.mock.calls.slice(-4)[1][0];
const laneTps = () => [...view!.container.querySelectorAll('span')].find(node => node.textContent === 'TPS')!.parentElement!.textContent;
const show = (r: ResultState) => { view = mount(<><RaceLane {...r} /><ComparisonCharts results={[r]} /></>); };

// Each fixture catches accepting an ineligible count/interval or conflating
// unavailable data with measured zero. Expected values are independently given.
const unavailable: [string, Partial<CompletionMetrics>, RegExp][] = [
  ['zero window', { finishTime: 1200 }, /150 ms/],
  ['1 ms buffered flush', { finishTime: 1201 }, /150 ms/],
  ['149 ms buffered flush', { finishTime: 1349 }, /150 ms/],
  ['missing output with large input/total', { outputTokens: undefined, inputTokens: 999900, tokenCount: 1000000 }, /output token count.*missing|missing.*output token count/i],
  ['negative output', { outputTokens: -1 }, /output token count.*invalid|invalid.*output token count/i],
  ['NaN output', { outputTokens: NaN }, /output token count.*invalid|invalid.*output token count/i],
  ['infinite output', { outputTokens: Infinity }, /output token count.*invalid|invalid.*output token count/i],
  ['negative infinite output', { outputTokens: -Infinity }, /output token count.*invalid|invalid.*output token count/i],
  ['missing first content', { firstTokenTime: undefined }, /timing/i],
  ['missing finish', { finishTime: undefined }, /timing/i],
  ['missing start', { startTime: undefined }, /timing/i],
  ['first before start', { startTime: 1300 }, /timing/i],
  ['finish before first', { finishTime: 1199 }, /timing/i],
  ['NaN first', { firstTokenTime: NaN }, /timing/i],
  ['infinite first', { firstTokenTime: Infinity }, /timing/i],
  ['NaN finish', { finishTime: NaN }, /timing/i],
  ['infinite finish', { finishTime: Infinity }, /timing/i],
  ['NaN start', { startTime: NaN }, /timing/i],
  ['infinite start', { startTime: -Infinity }, /timing/i],
  ['overflowed interval', { startTime: -Number.MAX_VALUE, firstTokenTime: -Number.MAX_VALUE, finishTime: Number.MAX_VALUE }, /timing/i],
  ['overflowed rate', { outputTokens: Number.MAX_VALUE, finishTime: 1350 }, /finite/i],
  ['stream events', { tokenCountSource: 'stream-events', timingSource: 'browser-synthetic' }, /stream events.*not output tokens/i],
  ['zero stream events', { outputTokens: 0, tokenCountSource: 'stream-events' }, /stream events.*not output tokens/i],
];

describe('shared output-throughput validity on real lane and chart components', () => {
  it.each(unavailable)('keeps %s unavailable, not zero', (_name, overrides, reason) => {
    show(result(overrides));
    expect(laneTps()).toBe('TPSN/A');
    expect(tpsChart().data.datasets[0].data).toEqual([null]);
    expect(tpsChart().options.plugins.tooltip.callbacks.label({ raw: null, dataIndex: 0 })).toMatch(/N\/A/);
    const details = view!.container.querySelector('[aria-label="Throughput values and availability"]')!;
    expect(details.textContent).toMatch(reason);
    expect(details.textContent).toContain('N/A');
  });

  it.each([
    ['150 ms boundary', { finishTime: 1350 }, 100 / .15, '666.67'],
    ['ordinary one-second window', {}, 100, '100.00'],
    ['zero output', { outputTokens: 0 }, 0, '0.00'],
    ['zero first/start timestamps', { startTime: 0, firstTokenTime: 0, finishTime: 1000 }, 100, '100.00'],
    ['fractional output estimate', { outputTokens: 1.5, tokenCountSource: 'estimated' }, 1.5, '1.50'],
  ] as const)('preserves %s', (_name, overrides, value, display) => {
    show(result(overrides));
    expect(laneTps()).toBe(`TPS${display}`);
    expect(tpsChart().data.datasets[0].data).toEqual([value]);
    expect(view!.container.querySelector('[aria-label="Throughput values and availability"]')!.textContent).toContain(`${display} TPS`);
  });

  it.each([
    ['estimated', { tokenCountSource: 'estimated' }, /estimated or mixed breakdown/i],
    ['provider reported', { tokenCountSource: 'provider-reported' }, /provider-reported output tokens/i],
    ['demo', { tokenCountSource: 'estimated', timingSource: 'demo' }, /demo.*estimated or mixed breakdown/i],
    ['legacy unspecified source', { tokenCountSource: undefined }, /source unspecified/i],
  ] as const)('qualifies %s without discarding a valid numeric rate', (_name, overrides, qualification) => {
    show(result(overrides));
    expect(laneTps()).toBe('TPS100.00');
    expect(tpsChart().data.datasets[0].data).toEqual([100]);
    const explanation = [...view!.container.querySelectorAll('p')].find(node => node.textContent?.includes('TTFT:'))!;
    expect(explanation.textContent).toMatch(qualification);
    expect(view!.container.querySelector('[aria-label="Throughput values and availability"]')!.textContent).toMatch(qualification);
    expect(tpsChart().options.plugins.tooltip.callbacks.label({ raw: 100, dataIndex: 0 })).toMatch(qualification);
  });

  it('explains missing metrics in a lane without inventing chart data', () => {
    const r = { ...result(), metrics: null };
    show(r);
    expect(laneTps()).toBe('TPSN/A');
    expect(tpsChart().data.datasets[0].data).toEqual([]);
  });

  it('keeps unavailable lanes last in both sort directions and retains identity, colors and source details', () => {
    const inputs = [
      result({ finishTime: 1201 }, 'OpenAI', 'x\u200by'),
      result({ outputTokens: 20, tokenCountSource: 'estimated' }, 'Anthropic', 'x\\u{200B}y'),
      result({ outputTokens: 0 }, 'Groq', 'zero'),
      result({ outputTokens: undefined }, 'Cohere', 'missing'),
      result({ outputTokens: 200 }, 'Google', 'fast'),
      result({ tokenCountSource: 'stream-events' }, 'Mistral', 'events'),
    ];
    const rawIds = inputs.map(r => ({ id: r.id, provider: r.providerName, model: r.modelName }));
    view = mount(<ComparisonCharts results={inputs} />);
    const assertOrder = (values: (number | null)[], labels: string[], providers: string[]) => {
      const chart = tpsChart();
      expect(chart.data.datasets[0].data).toEqual(values);
      expect(chart.data.labels).toEqual(labels);
      expect(chart.data.datasets[0].backgroundColor).toEqual(providers.map(p => getProviderColor(p).soft));
      expect(chart.data.datasets[0].borderColor).toEqual(providers.map(p => getProviderColor(p).solid));
      expect([...view!.container.querySelectorAll('[aria-label="Throughput values and availability"] li')].map(n => n.textContent?.match(/Lane \d+/)?.[0])).toEqual(labels);
    };
    assertOrder([200, 20, 0, null, null, null], ['Lane 5', 'Lane 2', 'Lane 3', 'Lane 1', 'Lane 4', 'Lane 6'], ['Google', 'Anthropic', 'Groq', 'OpenAI', 'Cohere', 'Mistral']);
    expect(tpsChart().options.plugins.tooltip.callbacks.title([{ dataIndex: 1 }])).toEqual(['Lane 2: Anthropic (x\\\\u{200B}y)']);
    expect(tpsChart().options.plugins.tooltip.callbacks.label({ raw: 20, dataIndex: 1 })).toMatch(/estimated or mixed breakdown/i);
    expect(tpsChart().options.plugins.tooltip.callbacks.title([{ dataIndex: 3 }])).toEqual(['Lane 1: OpenAI (x\\u{200B}y)']);
    click(view.container.querySelector('button')!);
    assertOrder([0, 20, 200, null, null, null], ['Lane 3', 'Lane 2', 'Lane 5', 'Lane 1', 'Lane 4', 'Lane 6'], ['Groq', 'Anthropic', 'Google', 'OpenAI', 'Cohere', 'Mistral']);
    expect(tpsChart().options.plugins.tooltip.callbacks.label({ raw: 0, dataIndex: 0 })).toMatch(/^0\b/);
    expect(tpsChart().options.plugins.tooltip.callbacks.label({ raw: null, dataIndex: 3 })).toMatch(/N\/A/);
    const mapping = view.container.querySelector('[aria-label="Chart model identifiers"]')!;
    expect(mapping.textContent).toContain('Escaped representation: x\\u{200B}y');
    expect(mapping.textContent).toContain('Escaped representation: x\\\\u{200B}y');
    expect(inputs.map(r => ({ id: r.id, provider: r.providerName, model: r.modelName }))).toEqual(rawIds);
    const chartRegion = view.container.querySelector('[aria-label="Bar chart showing output tokens per second for each AI model"]')!;
    const description = document.getElementById(chartRegion.getAttribute('aria-describedby')!);
    expect(description?.textContent).toMatch(/unavailable.*not zero/i);
    expect(description?.textContent).toMatch(/sort last/i);
    click(view.container.querySelector('button')!);
    assertOrder([200, 20, 0, null, null, null], ['Lane 5', 'Lane 2', 'Lane 3', 'Lane 1', 'Lane 4', 'Lane 6'], ['Google', 'Anthropic', 'Groq', 'OpenAI', 'Cohere', 'Mistral']);
  });
});
