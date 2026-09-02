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
  if (!row?.payload || row.payload.schemaVersion !== RACE_SHARE_SCHEMA) return null;
  return { payload: row.payload, expiresAt: row.expires_at };
}
