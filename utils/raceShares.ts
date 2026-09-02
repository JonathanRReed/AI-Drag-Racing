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
const isMetric = (value: unknown): boolean =>
  value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0);
const isText = (value: unknown, maxLength: number): boolean =>
  typeof value === 'string' && value.length > 0 && value.length <= maxLength;
const valueSources = new Set(['provider-reported', 'edge-measured', 'browser-measured', 'browser-synthetic', 'stream-events', 'estimated']);

export function isRaceSharePayload(value: unknown): value is RaceSharePayload {
  if (!isObject(value) || value.schemaVersion !== RACE_SHARE_SCHEMA ||
    typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt)) ||
    !['quick', 'lab'].includes(String(value.experience)) ||
    !['drag', 'token_limit', 'time_limit', 'free_for_all'].includes(String(value.mode)) ||
    !isObject(value.prompt) || typeof value.prompt.characters !== 'number' ||
    !Number.isSafeInteger(value.prompt.characters) || value.prompt.characters < 0 ||
    !isObject(value.environment) || !isObject(value.settings) ||
    !Array.isArray(value.lanes) || value.lanes.length < 1 || value.lanes.length > 12) return false;
  for (const field of ['edgeRegion', 'userAgentFamily']) {
    if (value.environment[field] !== null && !isText(value.environment[field], 100)) return false;
  }
  for (const field of ['temperature', 'maxTokens', 'topP', 'repetitions', 'concurrency']) {
    if (typeof value.settings[field] !== 'number' || !isMetric(value.settings[field])) return false;
  }
  return value.lanes.every(lane => isObject(lane) &&
    isText(lane.providerId, 80) && isText(lane.modelId, 240) &&
    isObject(lane.browser) && isObject(lane.edge) &&
    isMetric(lane.browser.ttftMs) && isMetric(lane.browser.totalMs) &&
    isMetric(lane.edge.ttftMs) && isMetric(lane.edge.totalMs) &&
    isMetric(lane.inputTokens) && isMetric(lane.outputTokens) &&
    valueSources.has(String(lane.tokenSource)) && valueSources.has(String(lane.timingSource)) &&
    ['completed', 'failed'].includes(String(lane.status)) &&
    (lane.errorCode === null || isText(lane.errorCode, 100)));
}

export function buildRaceSharePayload(receipt: RaceReceipt): RaceSharePayload {
  return {
    schemaVersion: RACE_SHARE_SCHEMA,
    createdAt: receipt.createdAt,
    experience: receipt.experience,
    mode: receipt.mode,
    prompt: { characters: receipt.prompt.characters },
    environment: { ...receipt.environment },
    settings: { ...receipt.settings },
    lanes: receipt.lanes.map((lane) => ({
      ...lane,
      browser: { ...lane.browser },
      edge: { ...lane.edge },
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
  const rows = await callRpc<Array<{ share_id: string; expires_at: string }>>(
    'create_ai_drag_race_share',
    { p_payload: buildRaceSharePayload(receipt) },
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
