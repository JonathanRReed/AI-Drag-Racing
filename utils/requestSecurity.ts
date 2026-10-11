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

/** Sanitize diagnostics only. Never serialize a whole upstream error/request. */
export function redactCredentials(input: unknown, keysToRedact?: string | readonly string[]): string {
  if (input == null) return '';
  let message = 'Unknown error';
  try {
    if (typeof input === 'string') {
      message = input;
    } else if (typeof input === 'object' && 'message' in input) {
      const value = (input as { message: unknown }).message;
      if (typeof value === 'string') message = value;
    }
  } catch {
    // Accessors/proxies and circular error objects must not break the error path.
  }

  // Locate secrets in the original message, then replace the union of ranges.
  // This avoids partial tokens, overlapping keys, and trusting incoming markers.
  const ranges: { start: number; end: number }[] = [];
  const patterns = [
    /\b(?:sk-|gsk[_-]|tvly-|xai-|ai21-|cls-|csk-)[A-Za-z0-9_.-]+/gi,
    /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
    /\b(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi,
    /\b((?:(?:x[-_])?api[-_]?key|access[-_]?token|session[-_]?token|(?:aws[-_]?)?secret[-_]?access[-_]?key|key)["']?\s*[:=]\s*)(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s"'&,;}\]]+)/gi,
  ];
  for (const pattern of patterns) {
    for (const match of message.matchAll(pattern)) {
      ranges.push({ start: match.index + (match[1]?.length ?? 0), end: match.index + match[0].length });
    }
  }

  const keys = typeof keysToRedact === 'string' ? [keysToRedact] : keysToRedact ?? [];
  const variants = new Set<string>();
  for (const key of keys) {
    // Every nonempty accepted key is sensitive, including one-character keys.
    for (const value of [key, sanitizeApiKey(key)]) {
      if (!value) continue;
      variants.add(value);
      variants.add(JSON.stringify(value).slice(1, -1));
      try { variants.add(encodeURIComponent(value)); } catch {}
    }
  }
  for (const value of variants) {
    for (let index = message.indexOf(value); index !== -1; index = message.indexOf(value, index + 1)) {
      ranges.push({ start: index, end: index + value.length });
    }
  }
  ranges.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: typeof ranges = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end);
    else merged.push({ ...range });
  }
  let result = '';
  let cursor = 0;
  for (const range of merged) {
    result += message.slice(cursor, range.start) + '[REDACTED]';
    cursor = range.end;
  }
  return result + message.slice(cursor);
}
