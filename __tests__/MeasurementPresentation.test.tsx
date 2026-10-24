// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RaceLane from '../components/main/RaceLane';
import FinishSummary from '../components/main/FinishSummary';
import SharedRaceView from '../components/main/SharedRaceView';
import ComparisonCharts from '../components/ComparisonCharts';
import type { ResultState } from '../components/main/ResultsDisplay';
import type { CompletionMetrics } from '../utils/providerService';
import { createRaceReceipt, loadRaceHistory, serializeSanitizedReceipt, RACE_HISTORY_STORAGE_KEY } from '../utils/raceReceipts';
import { buildRaceSharePayload, isRaceSharePayload } from '../utils/raceShares';
import { getProviderColor } from '../utils/providerColors';
import { click, mount } from './reactDom';

const { chartRender } = vi.hoisted(() => ({ chartRender: vi.fn() }));
vi.mock('react-chartjs-2', () => ({ Bar: (props: any) => { chartRender(props); return <div />; } }));
let view: ReturnType<typeof mount> | undefined;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); chartRender.mockClear(); localStorage.clear(); });
afterEach(() => { view?.unmount(); view = undefined; document.body.innerHTML = ''; vi.unstubAllGlobals(); });
const metrics = (overrides: Partial<CompletionMetrics> = {}): CompletionMetrics => ({ startTime: 1000, firstTokenTime: 1200, finishTime: 2200, tokenCount: 12, outputTokens: 12, tokenCountSource: 'stream-events', timingSource: 'browser-synthetic', ...overrides });
const result = (overrides: Partial<CompletionMetrics> = {}, id = 'lane'): ResultState => ({ id, modelName: id, providerName: 'OpenAI', responseText: 'synthetic', metrics: metrics(overrides), browserTiming: { ttftMs: 220, totalMs: 1250 }, edgeRegion: null, error: null, isLoading: false });
async function receipt(overrides: Partial<CompletionMetrics> = {}) {
  return createRaceReceipt({ id: 'synthetic', now: Date.UTC(2026, 9, 24), experience: 'lab', mode: 'time_limit', prompt: 'fixture', settings: { temperature: 0.7, maxTokens: 512, topP: 1, repetitions: 1, concurrency: 1 }, lanes: [{ providerId: 'openai', modelId: 'x\u200by', metrics: metrics(overrides), browser: { ttftMs: 220, totalMs: 1250 }, error: null }] });
}
const charts = () => chartRender.mock.calls.slice(-4).map(call => call[0]);

describe('measurement units and provenance on actual result surfaces', () => {
  it('shows streamed chunks rather than tokens on lane and finish cards, with browser timing source', () => {
    const input = result(); const original = JSON.stringify(input);
    view = mount(<><RaceLane {...input} /><FinishSummary results={[input]} mode="time_limit" /></>);
    expect(view.container.textContent).toContain('12 chunks');
    expect(view.container.querySelector('.finish-board-table thead')?.textContent).toContain('Output count');
    expect(view.container.querySelector('[data-label="Output count"]')?.textContent).toContain('12 chunks');
    expect(view.container.querySelector('[data-label="Edge first token"]')?.textContent).toBe('Not observed');
    expect(view.container.textContent).toMatch(/browser-synthetic/i);
    expect(view.container.textContent).toMatch(/chunks.*not.*token/i);
    expect(JSON.stringify(input)).toBe(original);
  });

  it('keeps the count and its provenance together in the mobile table value column', () => {
    view = mount(<FinishSummary results={[result()]} mode="time_limit" />);
    const cell = view.container.querySelector('[data-label="Output count"]')!;
    // The real responsive stylesheet makes td a flex row with its label in
    // ::before. Value and qualifier must therefore be one flex item.
    expect(cell.childNodes).toHaveLength(1);
    expect(cell.firstElementChild?.textContent).toMatch(/12 chunks.*not tokenizer tokens/);
  });

  it.each(['provider-reported', 'estimated', undefined] as const)('qualifies output values rather than asserting unsupported per-field origin: %s', source => {
    view = mount(<FinishSummary results={[result({ tokenCountSource: source, timingSource: 'edge-measured' })]} mode="drag" />);
    const cell = view.container.querySelector('[data-label="Output count"]');
    expect(cell?.textContent).toMatch(source === 'provider-reported' ? /12 tokens.*provider-reported/i : source === 'estimated' ? /12 tokens.*estimated or mixed/i : /12 tokens.*source is unspecified/i);
    expect(view.container.querySelector('[data-label="Edge first token"]')?.textContent).toBe('200 ms');
  });

  it.each([0, undefined, -1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1])('does not manufacture counts or suppress legitimate zero: %s', count => {
    view = mount(<FinishSummary results={[result({ outputTokens: count })]} mode="time_limit" />);
    expect(view.container.querySelector('[data-label="Output count"]')?.textContent).toMatch(count === 0 ? /0 chunks/ : /Not available/);
  });

  it.each(['browser-synthetic', 'demo', undefined] as const)('does not present %s intervals as edge or missing browser observations', timingSource => {
    const input = { ...result({ timingSource }), browserTiming: null };
    view = mount(<FinishSummary results={[input]} mode="drag" />);
    expect(view.container.querySelector('[data-label="Edge first token"]')?.textContent).toBe('Not observed');
    expect(view.container.querySelector('[data-label="Browser total"]')?.textContent).toBe('Not observed');
    expect(view.container.querySelector('.finish-board-time')?.textContent).toContain('Not observed');
  });

  it('retains edge timings for early natural completion alongside browser-limited lanes', () => {
    view = mount(<FinishSummary results={[result(), result({ tokenCountSource: 'provider-reported', timingSource: 'edge-measured' }, 'natural')]} mode="time_limit" />);
    expect([...view.container.querySelectorAll('[data-label="Edge first token"]')].map(n => n.textContent)).toEqual(['Not observed', '200 ms']);
    expect(view.container.textContent).toMatch(/12 chunks[\s\S]*12 tokens/);
  });

  it.each(['browser-synthetic', 'demo', undefined] as const)('stores no false edge fields in new %s receipts', async timingSource => {
    expect((await receipt({ timingSource })).lanes[0].edge).toEqual({ ttftMs: null, totalMs: null });
  });

  it('uses only known browser timing for a new failed receipt and qualifies empty legacy edge observations', async () => {
    const record = await createRaceReceipt({ id: 'failed', now: Date.UTC(2026, 9, 24), experience: 'lab', mode: 'drag', prompt: 'fixture', settings: { temperature: 0.7, maxTokens: 512, topP: 1, repetitions: 1, concurrency: 1 }, lanes: [{ providerId: 'openai', modelId: 'failed', metrics: null, browser: { ttftMs: null, totalMs: 800 }, error: 'Provider error' }] });
    expect(record.lanes[0]).toMatchObject({ timingSource: 'browser-measured', edge: { ttftMs: null, totalMs: null } });
    const payload = buildRaceSharePayload(record);
    expect(isRaceSharePayload(payload)).toBe(true);
    // Older records used this default even when no provider metric arrived.
    payload.lanes[0].timingSource = 'edge-measured';
    const original = JSON.stringify(payload);
    view = mount(<SharedRaceView record={{ payload, expiresAt: record.expiresAt }} />);
    expect(view.container.textContent).not.toContain('Edge-measured timing.');
    expect(view.container.textContent).toMatch(/edge timing not observed/i);
    expect(view.container.querySelectorAll('tbody td')[2].textContent).toBe('800 ms');
    expect(JSON.stringify(payload)).toBe(original);
    payload.lanes[0].timingSource = 'browser-measured';
    view.rerender(<SharedRaceView record={{ payload, expiresAt: record.expiresAt }} />);
    expect(view.container.textContent).toContain('Browser-measured timing');
    payload.lanes[0].browser = { ttftMs: null, totalMs: null };
    view.rerender(<SharedRaceView record={{ payload, expiresAt: record.expiresAt }} />);
    expect(view.container.textContent).not.toContain('Browser-measured timing');
    expect(view.container.textContent).toContain('Browser timing not observed.');
  });

  it('retains true edge fields, including a zero-valued origin clock', async () => {
    expect((await receipt({ timingSource: 'edge-measured', startTime: 0, firstTokenTime: 200, finishTime: 1200 })).lanes[0].edge).toEqual({ ttftMs: 200, totalMs: 1200 });
  });

  it('masks legacy synthetic edge values without rewriting local, exported or remote v1 values', async () => {
    const old = await receipt(); old.lanes[0].edge = { ttftMs: 200, totalMs: 1200 };
    const raw = JSON.stringify([old]); localStorage.setItem(RACE_HISTORY_STORAGE_KEY, raw);
    const loaded = loadRaceHistory(localStorage, Date.UTC(2026, 9, 24));
    const payload = buildRaceSharePayload(loaded[0]); const originalPayload = JSON.stringify(payload);
    view = mount(<SharedRaceView record={{ payload, expiresAt: old.expiresAt }} />);
    const cells = view.container.querySelectorAll('tbody td');
    expect(cells[1].textContent).toBe('Not reported');
    expect(cells[3].textContent).toMatch(/12 chunks/);
    expect(view.container.textContent).toMatch(/browser-synthetic/i);
    expect(localStorage.getItem(RACE_HISTORY_STORAGE_KEY)).toBe(raw);
    expect(JSON.parse(serializeSanitizedReceipt(loaded[0]))).toEqual(old);
    expect(JSON.stringify(payload)).toBe(originalPayload);
    expect(payload.lanes[0].edge).toEqual({ ttftMs: 200, totalMs: 1200 });
    expect(Object.keys(payload.lanes[0]).sort()).toEqual(['browser', 'edge', 'errorCode', 'inputTokens', 'modelId', 'outputTokens', 'providerId', 'status', 'timingSource', 'tokenSource']);
    expect(isRaceSharePayload(payload)).toBe(true);
  });

  it('preserves legacy token units with unspecified count origin and masks unprovenanced edge timing', async () => {
    const old = await receipt(); old.lanes[0].edge = { ttftMs: 200, totalMs: 1200 };
    const payload = buildRaceSharePayload(old);
    // Historical local data may lack fields; defensive rendering must not invent them.
    delete (payload.lanes[0] as Partial<typeof payload.lanes[0]>).tokenSource;
    delete (payload.lanes[0] as Partial<typeof payload.lanes[0]>).timingSource;
    view = mount(<SharedRaceView record={{ payload, expiresAt: old.expiresAt }} />);
    expect(view.container.querySelectorAll('tbody td')[1].textContent).toBe('Not reported');
    expect(view.container.querySelectorAll('tbody td')[3].textContent).toMatch(/12 tokens.*source is unspecified/);
    expect(view.container.textContent).toMatch(/timing source.*unspecified/i);
  });
});

describe('count and timing chart provenance', () => {
  it('leaves unobserved or invalid chart timings unavailable while preserving a genuine observed zero', () => {
    const inputs = [result({ firstTokenTime: undefined }, 'silent'), result({ startTime: 0, firstTokenTime: 0, finishTime: 0 }, 'zero'), result({ firstTokenTime: 1200 }, 'observed'), result({ firstTokenTime: 900, finishTime: 500 }, 'reversed'), result({ firstTokenTime: Infinity, finishTime: Infinity }, 'nonfinite')];
    view = mount(<ComparisonCharts results={inputs} />);
    expect(charts()[2].data.datasets[0].data).toEqual([200, 0, null, null, null]);
    expect(charts()[0].data.datasets[0].data).toEqual([1200, 1200, 0, null, null]);
    expect(charts()[2].options.plugins.tooltip.callbacks.title([{ dataIndex: 0 }])[0]).toContain('observed');
    expect(charts()[2].options.plugins.tooltip.callbacks.title([{ dataIndex: 1 }])[0]).toContain('zero');
    expect(view.container.textContent).toMatch(/missing or invalid timing.*unavailable.*not zero/i);
    click(view.container.querySelector('button')!);
    expect(charts()[2].data.datasets[0].data).toEqual([0, 200, null, null, null]);
    expect(charts()[0].data.datasets[0].data).toEqual([0, 1200, 1200, null, null]);
  });

  it.each([
    ['fractional estimate', 'estimated', 2.5, /estimated or mixed/i],
    ['legacy source absent', undefined, 12, /source is unspecified/i],
  ] as const)('retains the same output count for %s across lane, summary, token chart and TPS', (_name, source, count, detail) => {
    const input = result({ outputTokens: count, tokenCountSource: source, timingSource: 'edge-measured' });
    view = mount(<><RaceLane {...input} /><FinishSummary results={[input]} mode="drag" /><ComparisonCharts results={[input]} /></>);
    expect(view.container.querySelector('[data-label="Output count"]')?.textContent).toContain(`${count} tokens`);
    expect(view.container.querySelector('[data-label="Output count"]')?.textContent).toMatch(detail);
    expect(charts()[3].data.datasets[0].data).toEqual([count]);
    expect(charts()[1].data.datasets[0].data).toEqual([count]); // 1000 ms streaming window
    expect(view.container.querySelector('[aria-label="Output counts and measurement sources"]')?.textContent).toContain(`${count} tokens`);
    expect(view.container.querySelector('[aria-label="Throughput values and availability"]')?.textContent).toContain(`${count.toFixed(2)} TPS`);
    expect(view.container.textContent).not.toContain('unit unknown');
    expect(view.container.textContent).not.toContain('Not available');
  });

  it('excludes chunks and unknown units from token bars without replacing them by zero, retaining exact labels and colors through sorting', () => {
    const inputs = [result({}, 'chunks\u200b'), result({ tokenCountSource: 'estimated', outputTokens: 4 }, 'mixed'), result({ tokenCountSource: 'provider-reported', timingSource: 'edge-measured', outputTokens: 0 }, 'zero'), result({ tokenCountSource: 'unknown' as CompletionMetrics['tokenCountSource'], outputTokens: 99 }, 'unknown')];
    inputs[1].providerName = 'Anthropic'; inputs[2].providerName = 'Google';
    view = mount(<ComparisonCharts results={inputs} />);
    const tokenChart = () => charts()[3];
    expect(tokenChart().data.datasets[0].data).toEqual([4, 0, null, null]);
    expect(tokenChart().data.labels).toEqual(['Lane 2', 'Lane 3', 'Lane 1', 'Lane 4']);
    expect(tokenChart().data.datasets[0].backgroundColor).toEqual(['Anthropic', 'Google', 'OpenAI', 'OpenAI'].map(p => getProviderColor(p).soft));
    expect(tokenChart().options.plugins.tooltip.callbacks.label({ raw: 4, dataIndex: 0 })).toMatch(/estimated or mixed/i);
    const list = view.container.querySelector('[aria-label="Output counts and measurement sources"]');
    expect(list?.textContent).toMatch(/12 chunks/); expect(list?.textContent).toMatch(/99.*unit unknown/);
    expect(list?.textContent).toMatch(/browser-synthetic/i); expect(list?.textContent).toMatch(/edge-measured/i);
    click(view.container.querySelector('button')!);
    expect(tokenChart().data.datasets[0].data).toEqual([0, 4, null, null]);
    expect(tokenChart().data.labels).toEqual(['Lane 3', 'Lane 2', 'Lane 1', 'Lane 4']);
    expect(tokenChart().options.plugins.tooltip.callbacks.title([{ dataIndex: 2 }])[0]).toContain('chunks\\u{200B}');
    expect(charts()[0].options.plugins.tooltip.callbacks.label({ raw: 1200, dataIndex: 0 })).toMatch(/browser-synthetic/i);
  });
});
