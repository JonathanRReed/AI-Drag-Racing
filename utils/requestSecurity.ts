const PRODUCTION_ORIGIN = 'https://ai-dragrace.jonathanrreed.com';

function isLoopback(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';
}

export function isAllowedRequestOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  try {
    const requestUrl = new URL(request.url);
    const originUrl = new URL(origin);
    if (originUrl.origin === requestUrl.origin) return true;
    if (originUrl.origin === PRODUCTION_ORIGIN) return true;
    return isLoopback(requestUrl.hostname) && isLoopback(originUrl.hostname);
  } catch {
    return false;
  }
}

export function corsHeadersForRequest(request: Request): Record<string, string> | null {
  if (!isAllowedRequestOrigin(request)) return null;
  const origin = request.headers.get('origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

export async function readJsonBodyWithLimit(
  request: Request,
  maxBytes: number,
): Promise<{ ok: true; value: unknown } | { ok: false; error: string; status: 400 | 413 }> {
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { ok: false, error: `Request body exceeds the ${maxBytes.toLocaleString()} byte limit`, status: 413 };
  }
  if (!request.body) return { ok: false, error: 'Request body is required', status: 400 };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel('request body too large');
        return { ok: false, error: `Request body exceeds the ${maxBytes.toLocaleString()} byte limit`, status: 413 };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, error: 'Could not read request body', status: 400 };
  }

  const body = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  });
  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(body)) };
  } catch {
    return { ok: false, error: 'Invalid JSON body', status: 400 };
  }
}

export function sanitizeApiKey(key: string): string {
  if (typeof key !== 'string' || !key) return '';
  return key
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();
}

export function validateRaceRequestBody(body: unknown):
  | { ok: true; value: { prompt: string; model: string; apiKey: string; settings: Record<string, unknown> } }
  | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Request body must be an object' };
  const value = body as Record<string, unknown>;
  const prompt = typeof value.prompt === 'string' ? value.prompt : '';
  const model = typeof value.model === 'string' ? value.model : '';
  const rawApiKey = typeof value.apiKey === 'string' ? value.apiKey : '';
  const apiKey = sanitizeApiKey(rawApiKey);
  const settings = value.settings && typeof value.settings === 'object'
    ? value.settings as Record<string, unknown>
    : {};

  if (!prompt || !model || !apiKey) return { ok: false, error: 'Missing prompt, model, or API key' };
  if (prompt.length > 100_000) return { ok: false, error: 'Prompt exceeds the 100,000 character limit' };
  if (model.length > 512) return { ok: false, error: 'Model identifier is too long' };
  if (apiKey.length > 4096) return { ok: false, error: 'API key is too long' };

  return { ok: true, value: { prompt, model, apiKey, settings } };
}

export function boundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function redactCredentials(input: unknown, keyToRedact?: string | string[]): string {
  let str = '';
  if (typeof input === 'string') {
    str = input;
  } else if (input && typeof input === 'object' && 'message' in (input as Record<string, unknown>) && typeof (input as Record<string, unknown>).message === 'string') {
    str = (input as Record<string, unknown>).message as string;
  } else if (input instanceof Error) {
    str = input.message;
  } else {
    str = String(input ?? '');
  }

  if (!str) return '';

  const keys = Array.isArray(keyToRedact) ? keyToRedact : [keyToRedact];
  for (const key of keys) {
    if (key && typeof key === 'string' && key.length >= 4) {
      str = str.split(key).join('[REDACTED]');
    }
  }

  return str
    .replace(/\bsk-[a-zA-Z0-9_-]{8,}\b/g, '[REDACTED]')
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, '[REDACTED]')
    .replace(/\bBearer\s+[a-zA-Z0-9._-]{8,}\b/gi, 'Bearer [REDACTED]');
}
