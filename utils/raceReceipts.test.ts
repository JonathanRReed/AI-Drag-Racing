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
