import type { RaceReceipt } from './raceReceipts';

export const RACE_SHARE_SCHEMA = 'ai-drag-race-share.v1' as const;

export type RaceSharePayload = {
  schemaVersion: typeof RACE_SHARE_SCHEMA;
  createdAt: string;
  experience: RaceReceipt['experience'];
  mode: RaceReceipt['mode'];
  prompt: Pick<RaceReceipt['prompt'], 'characters'>;
  environment: RaceReceipt['environment'];
  settings: RaceReceipt['settings'];
  lanes: RaceReceipt['lanes'];
};

export type RaceShareRecord = {
  payload: RaceSharePayload;
  expiresAt: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? '';
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isRaceShareConfigured = (): boolean => Boolean(supabaseUrl && publishableKey);

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const hasExactKeys = (value: unknown, keys: string[]): value is Record<string, unknown> =>
  isObject(value) && Object.keys(value).length === keys.length &&
  keys.every(key => Object.prototype.hasOwnProperty.call(value, key));
const isMetric = (value: unknown): boolean =>
  value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER);
const isCount = (value: unknown, min = 0): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= min;
const isText = (value: unknown, maxLength: number): boolean =>
  typeof value === 'string' && value.trim().length > 0 && [...value].length <= maxLength;
const valueSources = new Set(['provider-reported', 'edge-measured', 'browser-measured', 'browser-synthetic', 'stream-events', 'estimated']);
const errorCodes = new Set(['aborted', 'timeout', 'rate_limited', 'authentication', 'provider_error']);

export function isRaceSharePayload(value: unknown): value is RaceSharePayload {
  if (!hasExactKeys(value, ['schemaVersion', 'createdAt', 'experience', 'mode', 'prompt', 'environment', 'settings', 'lanes']) || value.schemaVersion !== RACE_SHARE_SCHEMA ||
    typeof value.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.createdAt) || !Number.isFinite(Date.parse(value.createdAt)) || new Date(value.createdAt).toISOString() !== value.createdAt ||
    typeof value.experience !== 'string' || !['quick', 'lab'].includes(value.experience) ||
    typeof value.mode !== 'string' || !['drag', 'token_limit', 'time_limit', 'free_for_all'].includes(value.mode) ||
    !hasExactKeys(value.prompt, ['characters']) || !isCount(value.prompt.characters) ||
    !hasExactKeys(value.environment, ['edgeRegion', 'userAgentFamily']) ||
    !hasExactKeys(value.settings, ['temperature', 'maxTokens', 'topP', 'repetitions', 'concurrency']) ||
    !Array.isArray(value.lanes) || value.lanes.length < 1 || value.lanes.length > 12) return false;
  for (const field of ['edgeRegion', 'userAgentFamily']) {
    if (value.environment[field] !== null && !isText(value.environment[field], 100)) return false;
  }
  for (const field of ['temperature', 'maxTokens', 'topP', 'repetitions', 'concurrency']) {
    if (typeof value.settings[field] !== 'number' || !isMetric(value.settings[field])) return false;
  }
  if (Number(value.settings.temperature) > 2 || Number(value.settings.topP) > 1 ||
    !isCount(value.settings.maxTokens, 1) || !isCount(value.settings.repetitions, 1) || !isCount(value.settings.concurrency, 1)) return false;
  return value.lanes.every(lane => hasExactKeys(lane, ['providerId', 'modelId', 'browser', 'edge', 'inputTokens', 'outputTokens', 'tokenSource', 'timingSource', 'status', 'errorCode']) &&
    isText(lane.providerId, 80) && isText(lane.modelId, 240) &&
    hasExactKeys(lane.browser, ['ttftMs', 'totalMs']) && hasExactKeys(lane.edge, ['ttftMs', 'totalMs']) &&
    isMetric(lane.browser.ttftMs) && isMetric(lane.browser.totalMs) &&
    isMetric(lane.edge.ttftMs) && isMetric(lane.edge.totalMs) &&
    (lane.inputTokens === null || isCount(lane.inputTokens)) && (lane.outputTokens === null || isCount(lane.outputTokens)) &&
    typeof lane.tokenSource === 'string' && valueSources.has(lane.tokenSource) &&
    typeof lane.timingSource === 'string' && valueSources.has(lane.timingSource) &&
    typeof lane.status === 'string' && ['completed', 'failed'].includes(lane.status) &&
    (lane.errorCode === null || (typeof lane.errorCode === 'string' && errorCodes.has(lane.errorCode)))) &&
    new TextEncoder().encode(JSON.stringify(value)).length <= 16384;
}

export function buildRaceSharePayload(receipt: RaceReceipt): RaceSharePayload {
  return {
    schemaVersion: RACE_SHARE_SCHEMA,
    createdAt: receipt.createdAt,
    experience: receipt.experience,
    mode: receipt.mode,
    prompt: { characters: receipt.prompt.characters },
    environment: { edgeRegion: receipt.environment.edgeRegion, userAgentFamily: receipt.environment.userAgentFamily },
    settings: {
      temperature: receipt.settings.temperature, maxTokens: receipt.settings.maxTokens,
      topP: receipt.settings.topP, repetitions: receipt.settings.repetitions, concurrency: receipt.settings.concurrency,
    },
    lanes: receipt.lanes.map((lane) => ({
      providerId: lane.providerId, modelId: lane.modelId,
      browser: { ttftMs: lane.browser.ttftMs, totalMs: lane.browser.totalMs },
      edge: { ttftMs: lane.edge.ttftMs, totalMs: lane.edge.totalMs },
      inputTokens: lane.inputTokens, outputTokens: lane.outputTokens,
      tokenSource: lane.tokenSource, timingSource: lane.timingSource,
      status: lane.status, errorCode: lane.errorCode,
    })),
  };
}

async function callRpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  if (!isRaceShareConfigured()) throw new Error('Race sharing is not configured.');
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Race sharing failed with status ${response.status}.`);
  return response.json() as Promise<T>;
}

export async function createRaceShare(receipt: RaceReceipt): Promise<{ shareId: string; expiresAt: string }> {
  if (receipt.isDemo) throw new Error('Example races cannot be shared as measurements.');
  const payload = buildRaceSharePayload(receipt);
  if (!isRaceSharePayload(payload)) throw new Error('Invalid race receipt. Nothing was uploaded.');
  const rows = await callRpc<Array<{ share_id: string; expires_at: string }>>(
    'create_ai_drag_race_share',
    { p_payload: payload },
  );
  const row = rows[0];
  if (!row?.share_id || !row.expires_at) throw new Error('Race share did not return a receipt.');
  return { shareId: row.share_id, expiresAt: row.expires_at };
}

export async function getRaceShare(shareId: string): Promise<RaceShareRecord | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(shareId)) {
    return null;
  }
  const rows = await callRpc<Array<{ payload: RaceSharePayload; expires_at: string }>>(
    'get_ai_drag_race_share',
    { p_share_id: shareId },
  );
  const row = rows[0];
  if (!isRaceSharePayload(row?.payload) || !Number.isFinite(Date.parse(row.expires_at)) || Date.parse(row.expires_at) <= Date.now()) return null;
  return { payload: row.payload, expiresAt: row.expires_at };
}
