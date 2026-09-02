import type { CompletionMetrics } from './providerService';

export const RACE_RECEIPT_SCHEMA = 'ai-drag-race-receipt.v1' as const;
export const RACE_HISTORY_STORAGE_KEY = 'ai-drag-racing:history:v1';
export const RACE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_LOCAL_RECEIPTS = 50;

export type RaceExperience = 'quick' | 'lab';
export type RaceMode = 'drag' | 'token_limit' | 'time_limit' | 'free_for_all';
export type ValueSource =
  | 'provider-reported'
  | 'edge-measured'
  | 'browser-measured'
  | 'browser-synthetic'
  | 'stream-events'
  | 'estimated'
  | 'demo';

export interface BrowserTiming {
  ttftMs: number | null;
  totalMs: number | null;
}

export interface EdgeTiming {
  ttftMs: number | null;
  totalMs: number | null;
}

export interface RaceReceiptLane {
  providerId: string;
  modelId: string;
  browser: BrowserTiming;
  edge: EdgeTiming;
  inputTokens: number | null;
  outputTokens: number | null;
  tokenSource: ValueSource;
  timingSource: ValueSource;
  status: 'completed' | 'failed';
  errorCode: string | null;
}

export interface RaceReceipt {
  schemaVersion: typeof RACE_RECEIPT_SCHEMA;
  id: string;
  createdAt: string;
  expiresAt: string;
  experience: RaceExperience;
  mode: RaceMode;
  prompt: {
    characters: number;
    fingerprint: string;
  };
  environment: {
    edgeRegion: string | null;
    userAgentFamily: string | null;
  };
  settings: {
    temperature: number;
    maxTokens: number;
    topP: number;
    repetitions: number;
    concurrency: number;
  };
  lanes: RaceReceiptLane[];
  isDemo: boolean;
}

export interface ReceiptLaneInput {
  providerId: string;
  modelId: string;
  metrics: CompletionMetrics | null;
  browser: BrowserTiming;
  error: string | null;
}

export interface ReceiptInput {
  id?: string;
  now?: number;
  experience: RaceExperience;
  mode: RaceMode;
  prompt: string;
  edgeRegion?: string | null;
  userAgentFamily?: string | null;
  settings: RaceReceipt['settings'];
  lanes: ReceiptLaneInput[];
  isDemo?: boolean;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function duration(start: number | undefined, end: number | undefined): number | null {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  const value = Number(end) - Number(start);
  return value >= 0 ? Math.round(value) : null;
}

function sanitizeError(error: string | null): string | null {
  if (!error) return null;
  const normalized = error.toLowerCase();
  if (normalized.includes('abort')) return 'aborted';
  if (normalized.includes('timeout')) return 'timeout';
  if (normalized.includes('rate') || normalized.includes('429')) return 'rate_limited';
  if (normalized.includes('auth') || normalized.includes('401') || normalized.includes('403')) return 'authentication';
  return 'provider_error';
}

export async function fingerprintPrompt(prompt: string): Promise<string> {
  const bytes = new TextEncoder().encode(prompt);
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  // Deterministic, non-reversible fallback for older test/runtime environments.
  let hash = 2166136261;
  for (let index = 0; index < bytes.length; index += 1) {
    hash ^= bytes[index];
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export async function createRaceReceipt(input: ReceiptInput): Promise<RaceReceipt> {
  const now = input.now ?? Date.now();
  const fingerprint = await fingerprintPrompt(input.prompt);
  const isDemo = input.isDemo === true;

  return {
    schemaVersion: RACE_RECEIPT_SCHEMA,
    id: input.id ?? globalThis.crypto?.randomUUID?.() ?? `race-${now}-${fingerprint.slice(0, 8)}`,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + RACE_RETENTION_MS).toISOString(),
    experience: input.experience,
    mode: input.mode,
    prompt: {
      characters: input.prompt.length,
      fingerprint,
    },
    environment: {
      edgeRegion: input.edgeRegion ?? null,
      userAgentFamily: input.userAgentFamily ?? null,
    },
    settings: input.settings,
    lanes: input.lanes.map((lane) => ({
      providerId: lane.providerId,
      modelId: lane.modelId,
      browser: lane.browser,
      edge: {
        ttftMs: duration(lane.metrics?.startTime, lane.metrics?.firstTokenTime),
        totalMs: duration(lane.metrics?.startTime, lane.metrics?.finishTime),
      },
      inputTokens: lane.metrics?.inputTokens ?? null,
      outputTokens: lane.metrics?.outputTokens ?? null,
      tokenSource: isDemo ? 'demo' : lane.metrics?.tokenCountSource ?? 'estimated',
      timingSource: isDemo ? 'demo' : lane.metrics?.timingSource ?? 'edge-measured',
      status: lane.error ? 'failed' : 'completed',
      errorCode: sanitizeError(lane.error),
    })),
    isDemo,
  };
}

export function loadRaceHistory(storage: StorageLike, now = Date.now()): RaceReceipt[] {
  const raw = storage.getItem(RACE_HISTORY_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('history is not an array');
    const valid = parsed
      .filter((receipt): receipt is RaceReceipt => (
        receipt?.schemaVersion === RACE_RECEIPT_SCHEMA
        && typeof receipt.id === 'string'
        && Date.parse(receipt.expiresAt) > now
        && Array.isArray(receipt.lanes)
      ))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, MAX_LOCAL_RECEIPTS);

    if (valid.length !== parsed.length) {
      storage.setItem(RACE_HISTORY_STORAGE_KEY, JSON.stringify(valid));
    }
    return valid;
  } catch {
    storage.removeItem(RACE_HISTORY_STORAGE_KEY);
    return [];
  }
}

export function saveRaceReceipt(storage: StorageLike, receipt: RaceReceipt, now = Date.now()): RaceReceipt[] {
  if (receipt.isDemo) return loadRaceHistory(storage, now);
  const history = loadRaceHistory(storage, now).filter((entry) => entry.id !== receipt.id);
  const next = [receipt, ...history].slice(0, MAX_LOCAL_RECEIPTS);
  storage.setItem(RACE_HISTORY_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function deleteRaceReceipt(storage: StorageLike, id: string, now = Date.now()): RaceReceipt[] {
  const next = loadRaceHistory(storage, now).filter((entry) => entry.id !== id);
  if (next.length) storage.setItem(RACE_HISTORY_STORAGE_KEY, JSON.stringify(next));
  else storage.removeItem(RACE_HISTORY_STORAGE_KEY);
  return next;
}

export function clearRaceHistory(storage: StorageLike): void {
  storage.removeItem(RACE_HISTORY_STORAGE_KEY);
}

export function serializeSanitizedReceipt(receipt: RaceReceipt): string {
  return JSON.stringify(receipt, null, 2);
}
