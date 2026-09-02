import { describe, expect, it } from 'vitest';
import { buildRaceSharePayload, RACE_SHARE_SCHEMA } from './raceShares';
import type { RaceReceipt } from './raceReceipts';

const receipt: RaceReceipt = {
  schemaVersion: 'ai-drag-race-receipt.v1',
  id: 'local-only',
  createdAt: '2026-09-01T00:00:00.000Z',
  expiresAt: '2026-10-01T00:00:00.000Z',
  experience: 'quick',
  mode: 'drag',
  prompt: { characters: 42, fingerprint: 'abc123' },
  environment: { edgeRegion: 'ORD', userAgentFamily: 'Chromium' },
  settings: { temperature: 0.7, maxTokens: 2048, topP: 1, repetitions: 1, concurrency: 1 },
  lanes: [{
    providerId: 'openai',
    modelId: 'gpt-5',
    browser: { ttftMs: 220, totalMs: 1100 },
    edge: { ttftMs: 180, totalMs: 980 },
    inputTokens: 10,
    outputTokens: 100,
    tokenSource: 'provider-reported',
    timingSource: 'edge-measured',
    status: 'completed',
    errorCode: null,
  }],
  isDemo: false,
};

describe('race share payload', () => {
  it('contains only the approved sanitized receipt fields', () => {
    const payload = buildRaceSharePayload(receipt);
    expect(payload.schemaVersion).toBe(RACE_SHARE_SCHEMA);
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('local-only');
    expect(serialized).not.toContain('apiKey');
    expect(serialized).not.toContain('promptText');
    expect(serialized).not.toContain('responseText');
    expect(serialized).not.toContain('fingerprint');
    expect(payload.prompt).toEqual({ characters: 42 });
    expect(payload.lanes).toHaveLength(1);
  });
});
