// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FinishSummary from '../components/main/FinishSummary';
import StandingsTicker from '../components/main/StandingsTicker';
import RaceHistory from '../components/main/RaceHistory';
import SharedRaceView from '../components/main/SharedRaceView';
import type { ResultState } from '../components/main/ResultsDisplay';
import { createLaneBuffer, pushChunk } from '../utils/raceBuffers';
import { buildRaceSharePayload } from '../utils/raceShares';
import type { RaceMode, RaceReceipt } from '../utils/raceReceipts';
import { mount } from './reactDom';

let view: ReturnType<typeof mount> | undefined;
beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true));
afterEach(() => { view?.unmount(); view = undefined; vi.unstubAllGlobals(); });
function result(id: string, text: string, totalMs: number, error: string | null = null): ResultState {
  return { id, providerName: 'openai', modelName: id, responseText: text, metrics: null, browserTiming: { ttftMs: 100, totalMs }, isLoading: false, error, edgeRegion: null };
}
const short = result('ShortEarly', 'a'.repeat(100), 1000);
const more = result('MoreOutput', 'b'.repeat(1000), 5000);
function receipt(mode: RaceMode, counts: unknown[] = [100, 1000], statuses: Array<'completed' | 'failed'> = ['completed', 'completed']): RaceReceipt {
  return { schemaVersion: 'ai-drag-race-receipt.v1', id: 'synthetic', createdAt: '2026-10-24T12:00:00.000Z', expiresAt: '2026-11-23T12:00:00.000Z', experience: 'lab', mode, prompt: { characters: 4, fingerprint: 'test' }, environment: { edgeRegion: null, userAgentFamily: null }, settings: { temperature: 0.7, maxTokens: 512, topP: 1, repetitions: 1, concurrency: 1 }, isDemo: false,
    lanes: counts.map((count, i) => ({ providerId: 'openai', modelId: i === 0 ? 'ShortEarly' : 'MoreOutput', browser: { ttftMs: 100, totalMs: i === 0 ? 1000 : 5000 }, edge: { ttftMs: 100, totalMs: 1000 }, inputTokens: 1, outputTokens: i === 0 ? 10000 : 1, tokenSource: 'stream-events', timingSource: 'browser-synthetic', status: statuses[i] ?? 'completed', errorCode: null, ...(count === undefined ? {} : { outputCharacters: count }) })) as RaceReceipt['lanes'] };
}
function history(value: RaceReceipt) { view = mount(<RaceHistory receipts={[value]} onDelete={() => {}} onClear={() => {}} />); return view.container.querySelector('.race-history-row strong')?.textContent; }
function summary(mode: RaceMode, results = [short, more]) { view = mount(<FinishSummary results={results} mode={mode} />); return view.container; }
function standings(mode: RaceMode, running = false, results = [short, more]) {
  const buffers = Object.fromEntries(results.map(r => { const b = createLaneBuffer(r.id); pushChunk(b, r.responseText, r.browserTiming!.totalMs!); b.done = true; b.errored = !!r.error; b.finalOutputTokens = 999; return [r.id, b]; }));
  view = mount(<StandingsTicker lanes={results.map(r => ({ id: r.id, label: r.providerName, sublabel: r.modelName, color: '#fff' }))} buffersRef={{ current: buffers }} mode={mode} running={running} reducedMotion />);
  return [...view.container.querySelectorAll('li')].map(li => li.textContent);
}
describe('mode-aware result ranking', () => {
  it('selects more output rather than a short early finish for Time Trial', () => {
    const ui = summary('time_limit');
    expect(ui.querySelector('h2')?.textContent).toBe('Most output, this Time Trial');
    expect(ui.querySelector('.finish-board-lead p')?.textContent).toContain('MoreOutput');
    expect(ui.querySelector('tbody tr[data-leader="true"]')?.textContent).toContain('MoreOutput');
    expect(ui.querySelector('.finish-board-time')?.textContent).toContain('1000');
    expect(ui.textContent).toContain('UTF-16 code units');
  });
  it.each(['drag', 'token_limit', 'free_for_all'] as const)('preserves fastest finish for %s', mode => {
    const ui = summary(mode); expect(ui.querySelector('h2')?.textContent).toBe('Fastest here, this run');
    expect(ui.querySelector('.finish-board-lead p')?.textContent).toContain('ShortEarly');
  });
  it.each(['drag', 'token_limit', 'time_limit', 'free_for_all'] as const)('preserves live output ordering for %s', mode => { expect(standings(mode, true)[0]).toContain('MoreOutput'); });
  it('shows the same Time Trial output unit and leader as the finish summary', () => {
    const rows = standings('time_limit'); expect(rows[0]).toContain('MoreOutput'); expect(rows[0]).toContain('1k ch'); expect(rows[0]).not.toContain('999 tok');
    expect(view!.container.textContent).toContain('UTF-16 code units');
  });
  it.each(['drag', 'token_limit', 'free_for_all'] as const)('preserves completed %s standings', mode => { expect(standings(mode)[0]).toContain('ShortEarly'); });
  it('preserves exact raw identity and input order for tied output despite different timings', () => {
    const first = result('org/👩\u200d💻', '😀', 5000); const second = result('org/👩💻', 'ab', 1000);
    const ui = summary('time_limit', [first, second]);
    expect(ui.querySelector('.finish-board-lead bdi')?.textContent).toBe(first.modelName);
    expect(ui.querySelector('.finish-board-time strong')?.textContent).toBe('2');
  });
  it('excludes failed lanes and keeps legitimate zero output', () => {
    const ui = summary('time_limit', [result('failed', 'x'.repeat(2000), 1, 'failure'), result('empty', '', 5000)]);
    expect(ui.querySelector('.finish-board-lead p')?.textContent).toContain('empty'); expect(ui.querySelector('.finish-board-time strong')?.textContent).toBe('0');
    expect(ui.querySelector('[data-unfinished]')?.textContent).toContain('failed');
  });
  it('does not declare a winner when every lane failed', () => { const ui = summary('time_limit', [result('failed', 'x', 1, 'failure')]); expect(ui.querySelector('[data-leader="true"]')).toBeNull(); expect(ui.textContent).toContain('No lane finished'); });
});
describe('local and shared ranking evidence', () => {
  it('highlights the local Time Trial output leader without mutating the receipt', () => { const value = receipt('time_limit'); const before = JSON.stringify(value); expect(history(value)).toBe('MoreOutput'); expect(JSON.stringify(value)).toBe(before); });
  it.each([undefined, null, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1000'])('does not invent a Time Trial winner with count %s', count => {
    const value = receipt('time_limit', [100, count]); const before = JSON.stringify(value);
    expect(history(value)).toBe('Time Trial ranking unavailable'); expect(view!.container.textContent).toContain('Output length was not recorded for every completed lane'); expect(JSON.stringify(value)).toBe(before);
  });
  it.each([true, false])('puts Time Trial explanation in its own wrapping paragraph (legacy=%s)', legacy => {
    history(receipt('time_limit', legacy ? [undefined, undefined] : [100, 1000]));
    const note = view!.container.querySelector('.race-history-row p');
    expect(note).not.toBeNull();
    expect(note?.classList.contains('whitespace-normal')).toBe(true);
    expect(note?.classList.contains('break-words')).toBe(true);
    expect(note?.classList.contains('max-w-full')).toBe(true);
    expect(note?.textContent).toContain(legacy ? 'Output length was not recorded' : '1000 UTF-16 code units');
  });
  it('does not add ranking explanations to ordinary history rows', () => { history(receipt('drag')); expect(view!.container.querySelector('.race-history-row p')).toBeNull(); });
  it('does not infer legacy output from token counts', () => { expect(history(receipt('time_limit', [undefined, undefined]))).toBe('Time Trial ranking unavailable'); });
  it('keeps the first completed lane on equal output including zero', () => { expect(history(receipt('time_limit', [0, 0]))).toBe('ShortEarly'); });
  it('ignores missing counts on failed lanes', () => { expect(history(receipt('time_limit', [undefined, 0], ['failed', 'completed']))).toBe('MoreOutput'); });
  it('shows no completed lane when all candidates failed', () => { expect(history(receipt('time_limit', [100, 1000], ['failed', 'failed']))).toBe('No completed lane'); });
  it.each(['drag', 'token_limit', 'free_for_all'] as const)('preserves %s history timing order', mode => { expect(history(receipt(mode))).toBe('ShortEarly'); });
  it('keeps shared Time Trials in neutral source order with unavailable evidence explained', () => {
    const local = receipt('time_limit'); local.lanes.reverse();
    const record = { payload: buildRaceSharePayload(local), expiresAt: local.expiresAt };
    view = mount(<SharedRaceView record={record} />);
    expect(view.container.querySelector('tbody tr')?.textContent).toContain('MoreOutput');
    expect(view.container.textContent).toContain('Time Trial ranking unavailable');
    expect(view.container.textContent).toContain('Output length is not included in this shared receipt');
  });
});
