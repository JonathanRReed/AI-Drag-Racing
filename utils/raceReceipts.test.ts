import { describe, expect, it } from 'vitest';
import {
  RACE_HISTORY_STORAGE_KEY,
  RACE_RECEIPT_SCHEMA,
  RACE_RETENTION_MS,
  clearRaceHistory,
  createRaceReceipt,
  deleteRaceReceipt,
  loadRaceHistory,
  saveRaceReceipt,
  serializeSanitizedReceipt,
} from './raceReceipts';

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

async function receipt(now = Date.UTC(2026, 8, 1)) {
  return createRaceReceipt({
    id: `race-${now}`,
    now,
    experience: 'quick',
    mode: 'drag',
    prompt: 'Compare this privately',
    edgeRegion: 'ORD',
    userAgentFamily: 'Chromium',
    settings: { temperature: 0.7, maxTokens: 512, topP: 1, repetitions: 1, concurrency: 1 },
    lanes: [{
      providerId: 'openai',
      modelId: 'gpt-test',
      metrics: {
        startTime: 1000,
        firstTokenTime: 1250,
        finishTime: 2000,
        tokenCount: 30,
        inputTokens: 8,
        outputTokens: 22,
        tokenCountSource: 'estimated',
        timingSource: 'edge-measured',
      },
      browser: { ttftMs: 310, totalMs: 1090 },
      error: null,
    }],
  });
}

describe('race receipts', () => {
  it('stores metrics without storing prompt text or generated output', async () => {
    const value = await receipt();
    const serialized = JSON.stringify(value);

    expect(value.schemaVersion).toBe(RACE_RECEIPT_SCHEMA);
    expect(value.prompt.characters).toBe(22);
    expect(value.prompt.fingerprint.length).toBeGreaterThan(8);
    expect(serialized).not.toContain('Compare this privately');
    expect(value.lanes[0].browser.ttftMs).toBe(310);
    expect(value.lanes[0].edge.ttftMs).toBe(250);
  });

  it('expires local history after 30 days', async () => {
    const store = storage();
    const now = Date.UTC(2026, 8, 1);
    saveRaceReceipt(store, await receipt(now), now);

    expect(loadRaceHistory(store, now + RACE_RETENTION_MS - 1)).toHaveLength(1);
    expect(loadRaceHistory(store, now + RACE_RETENTION_MS + 1)).toEqual([]);
    expect(store.getItem(RACE_HISTORY_STORAGE_KEY)).toBe('[]');
  });

  it('never saves demo races', async () => {
    const store = storage();
    const value = await receipt();
    value.isDemo = true;
    expect(saveRaceReceipt(store, value)).toEqual([]);
    expect(store.getItem(RACE_HISTORY_STORAGE_KEY)).toBeNull();
  });

  it('supports deleting one receipt and clearing everything', async () => {
    const store = storage();
    const first = await receipt(Date.UTC(2026, 8, 1));
    const second = await receipt(Date.UTC(2026, 8, 2));
    saveRaceReceipt(store, first, Date.UTC(2026, 8, 2));
    saveRaceReceipt(store, second, Date.UTC(2026, 8, 2));

    expect(deleteRaceReceipt(store, second.id, Date.UTC(2026, 8, 2))).toEqual([first]);
    clearRaceHistory(store);
    expect(loadRaceHistory(store)).toEqual([]);
  });
});

it('preserves optional valid output length, including zero, without guessing missing or invalid values', async () => {
  for (const count of [0, 5, Number.MAX_SAFE_INTEGER, undefined, null, -1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1, '5']) {
    const value = await createRaceReceipt({ experience: 'lab', mode: 'time_limit', prompt: 'private', settings: { temperature: 0.7, maxTokens: 512, topP: 1, repetitions: 1, concurrency: 1 },
      lanes: [{ providerId: 'openai', modelId: 'org/👩\u200d💻', metrics: { startTime: 1, finishTime: 1001, tokenCount: 999, outputTokens: 999 }, browser: { ttftMs: null, totalMs: 1000 }, error: null, outputCharacters: count as number }],
    });
    const lane = value.lanes[0];
    if (typeof count === 'number' && Number.isSafeInteger(count) && count >= 0) expect(lane.outputCharacters).toBe(count);
    else expect(Object.hasOwn(lane, 'outputCharacters')).toBe(false);
    expect(lane.modelId).toBe('org/👩\u200d💻'); expect(lane.outputTokens).toBe(999);
    expect(JSON.parse(serializeSanitizedReceipt(value))).toEqual(value);
  }
});

it('loads and exports old records without adding output length or changing their JSON values', async () => {
  const now = Date.UTC(2026, 8, 1); const store = storage(); const value = await receipt(now); value.mode = 'time_limit';
  const original = JSON.stringify([value]); store.setItem(RACE_HISTORY_STORAGE_KEY, original);
  const loaded = loadRaceHistory(store, now);
  expect(store.getItem(RACE_HISTORY_STORAGE_KEY)).toBe(original);
  expect(JSON.stringify(loaded)).toBe(original);
  expect(JSON.parse(serializeSanitizedReceipt(loaded[0]))).toEqual(value);
  expect(Object.hasOwn(loaded[0].lanes[0], 'outputCharacters')).toBe(false);
});
