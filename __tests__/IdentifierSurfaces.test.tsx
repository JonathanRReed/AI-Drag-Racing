// @vitest-environment happy-dom
import React from 'react';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RaceLane from '../components/main/RaceLane';
import DragStrip from '../components/main/DragStrip';
import StandingsTicker from '../components/main/StandingsTicker';
import FinishSummary from '../components/main/FinishSummary';
import RaceHistory from '../components/main/RaceHistory';
import SharedRaceView from '../components/main/SharedRaceView';
import RaceSettings from '../components/sidebar/RaceSettings';
import { createRaceReceipt, serializeSanitizedReceipt, saveRaceReceipt, loadRaceHistory } from '../utils/raceReceipts';
import { buildRaceSharePayload } from '../utils/raceShares';
import { streamCompletion } from '../utils/apiClient';
import { createLaneBuffer } from '../utils/raceBuffers';
import { click, mount } from './reactDom';

let view: ReturnType<typeof mount>;
const raw = 'o3\u202e-evil\\u{200B}';
const escaped = 'o3\\u{202E}-evil\\\\u{200B}';
const result = { id: `openai-${raw}`, providerName: 'OpenAI', modelName: raw, responseText: 'Synthetic', metrics: { startTime: 100, firstTokenTime: 200, finishTime: 400, tokenCount: 20, outputTokens: 20 }, isLoading: false, error: null, browserTiming: { ttftMs: 100, totalMs: 300 }, edgeRegion: null };
const lane = { id: result.id, label: 'OpenAI', sublabel: raw, color: '#fff' };
const buffer = createLaneBuffer(lane.id);
const buffersRef = { current: { [lane.id]: buffer } };
const config = { mode: 'drag' as const, tokenLimit: 512, timeLimit: 30, reasoningEffort: 'high' as const, modelSettings: { temperature: 0.7, maxTokens: 512, topP: 1, reasoningEffort: 'high' as const } };
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); localStorage.clear(); });
afterEach(() => { view?.unmount(); vi.unstubAllGlobals(); });
const receipt = () => createRaceReceipt({ id: 'synthetic-receipt', experience: 'quick', mode: 'drag', prompt: 'Synthetic', settings: { temperature: .7, maxTokens: 512, topP: 1, repetitions: 1, concurrency: 1 }, lanes: [{ providerId: 'openai', modelId: raw, metrics: result.metrics, browser: result.browserTiming, error: null }] });

function expectSafe() {
  expect(view.container.textContent).not.toContain('\u202e');
  expect(view.container.textContent).toContain(`Escaped representation: ${escaped}`);
  for (const node of view.container.querySelectorAll('[title], [aria-label]')) {
    expect(node.getAttribute('title') ?? '').not.toContain('\u202e');
    expect(node.getAttribute('aria-label') ?? '').not.toContain('\u202e');
  }
}

describe('identifier render surfaces', () => {
  it.each([
    ['result lane', () => <RaceLane {...result} />],
    ['drag strip', () => <DragStrip lanes={[lane]} buffersRef={buffersRef} goTimeRef={{ current: 0 }} running={false} reducedMotion />],
    ['standings', () => <StandingsTicker lanes={[lane]} buffersRef={buffersRef} running={false} mode="drag" reducedMotion />],
    ['finish board', () => <FinishSummary results={[result]} />],
  ] as const)('isolates and safely identifies the %s without mutating inputs', (_, render) => {
    const before = JSON.stringify({ result, lane });
    view = mount(render()); expectSafe();
    expect(JSON.stringify({ result, lane })).toBe(before);
  });
  it('shows historical control and separator characters safely, retaining stored/exported/shared IDs', async () => {
    const record = await receipt();
    record.lanes[0].modelId = raw + '\u0000\u0085\u2028';
    saveRaceReceipt(localStorage, record);
    const loaded = loadRaceHistory(localStorage);
    view = mount(<RaceHistory receipts={loaded} onDelete={() => {}} onClear={() => {}} />);
    expectSafe();
    expect(view.container.textContent).toContain('\\u{0}\\u{85}\\u{2028}');
    expect(JSON.parse(serializeSanitizedReceipt(loaded[0])).lanes[0].modelId).toBe(record.lanes[0].modelId);
    expect(buildRaceSharePayload(loaded[0]).lanes[0].modelId).toBe(record.lanes[0].modelId);
    expect(JSON.parse(localStorage.getItem('ai-drag-racing:history:v1')!)[0].lanes[0].modelId).toBe(record.lanes[0].modelId);
  });
  it('keeps historical technical details and page controls visible under the actual history stylesheet', async () => {
    const style = document.createElement('style');
    const compiled = await postcss([tailwindcss({ base: process.cwd(), optimize: true })]).process(readFileSync(`${process.cwd()}/styles/globals.css`, 'utf8'), { from: `${process.cwd()}/styles/globals.css` });
    // Happy DOM does not implement cascade layers. Flatten only that wrapper,
    // keeping the actual compiled selectors/declarations and their order.
    const rules = postcss.parse(compiled.css);
    rules.walkAtRules('layer', rule => { if (rule.nodes) rule.replaceWith(...rule.nodes); else rule.remove(); });
    style.textContent = rules.toString();
    document.head.append(style);
    try {
      const record = await receipt();
      record.lanes[0].modelId = 'a'.repeat(512) + '\u202eEND';
      view = mount(<RaceHistory receipts={[record]} onDelete={() => {}} onClear={() => {}} />);
      for (const element of view.container.querySelectorAll('.model-identifier-detail, .model-identifier-detail span')) {
        expect(getComputedStyle(element).whiteSpace).toBe('normal');
        expect(getComputedStyle(element).overflow).not.toBe('hidden');
      }
      const ordinary = { ...record, lanes: [{ ...record.lanes[0], modelId: 'gpt-4o' }] };
      view.rerender(<><FinishSummary results={[{ ...result, modelName: 'gpt-4o' }]} /><RaceHistory receipts={[ordinary]} onDelete={() => {}} onClear={() => {}} /><SharedRaceView record={{ payload: buildRaceSharePayload(ordinary), expiresAt: '2030-01-01T00:00:00Z' }} /></>);
      const winner = view.container.querySelector('.finish-board-lead p > span:first-child')!;
      const pixels = (size: string) => parseFloat(size) * (size.endsWith('rem') ? parseFloat(getComputedStyle(document.documentElement).fontSize) : 1);
      expect(pixels(getComputedStyle(winner).fontSize)).toBe(pixels(getComputedStyle(winner.parentElement!).fontSize));
      expect(getComputedStyle(winner).opacity).not.toBe('0.7');
      for (const selector of ['.race-history-row strong > span', '.shared-race th strong > span']) {
        const primary = view.container.querySelector(selector)!;
        expect(getComputedStyle(primary).color).toBe(getComputedStyle(primary.parentElement!).color);
      }
    } finally { style.remove(); }
  });
  it('renders older shared identifiers safely without altering the shared payload', async () => {
    const record = { payload: buildRaceSharePayload(await receipt()), expiresAt: '2030-01-01T00:00:00Z' };
    const before = JSON.stringify(record);
    view = mount(<SharedRaceView record={record} />); expectSafe();
    expect(JSON.stringify(record)).toBe(before);
  });
  it('retains raw model identity in shared row reconciliation, not display text or position', async () => {
    const record = { payload: buildRaceSharePayload(await receipt()), expiresAt: '2030-01-01T00:00:00Z' };
    view = mount(<SharedRaceView record={record} />);
    const originalRow = view.container.querySelector('tbody tr');
    const next = { ...record, payload: { ...record.payload, lanes: record.payload.lanes.map(lane => ({ ...lane, modelId: 'different-model' })) } };
    view.rerender(<SharedRaceView record={next} />);
    expect(view.container.querySelector('tbody tr')).not.toBe(originalRow);
    expect(view.container.querySelector('tbody tr')?.textContent).toContain('different-model');
  });
  it('names reasoning controls safely while exclusions retain the exact ID', () => {
    const onChange = vi.fn();
    view = mount(<RaceSettings config={config} onChange={onChange} selectedPairs={[{ providerId: 'openai', modelId: raw }]} />);
    click(view.container.querySelector<HTMLButtonElement>('button[aria-controls="race-settings-content"]')!);
    expectSafe();
    const toggle = view.container.querySelector<HTMLButtonElement>('button[aria-label^="Reasoning effort for"]')!;
    expect(toggle.getAttribute('aria-label')).toBe(`Reasoning effort for Escaped representation: ${escaped}`);
    click(toggle);
    expect(onChange.mock.calls[0][0].excludedReasoningModels).toEqual([raw]);
  });
  it('sends exact original IDs after safe rendering, never the escaped presentation', async () => {
    view = mount(<FinishSummary results={[result]} />); expectSafe();
    const fetch = vi.fn().mockResolvedValue({ ok: true, body: new ReadableStream({ start(controller) { controller.close(); } }) });
    vi.stubGlobal('fetch', fetch);
    for await (const _ of streamCompletion('openai', 'Synthetic', raw, 'synthetic-key')) { /* no provider calls */ }
    expect(JSON.parse(fetch.mock.calls[0][1].body).model).toBe(raw);
  });
});
