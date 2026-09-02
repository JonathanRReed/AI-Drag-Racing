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

export function validateRaceRequestBody(body: unknown):
  | { ok: true; value: { prompt: string; model: string; apiKey: string; settings: Record<string, unknown> } }
  | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Request body must be an object' };
  const value = body as Record<string, unknown>;
  const prompt = typeof value.prompt === 'string' ? value.prompt : '';
  const model = typeof value.model === 'string' ? value.model : '';
  const apiKey = typeof value.apiKey === 'string' ? value.apiKey.trim() : '';
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
