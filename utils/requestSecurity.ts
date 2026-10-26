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

export function isValidProviderId(id: unknown): boolean {
  if (typeof id !== 'string' || !id || id.length > 80 || id.trim() !== id) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F-\x9F\u2028\u2029]/u.test(id)) return false;
  try {
    const decoded = decodeURIComponent(id);
    // eslint-disable-next-line no-control-regex
    if (/[\x00-\x1F\x7F-\x9F\u2028\u2029]/u.test(decoded)) return false;
  } catch {
    return false;
  }
  return true;
}

export function sanitizeModelId(id: unknown): string {
  // Provider identifiers are opaque. Rewriting or truncating one can silently
  // select another model, so reject invalid values rather than repair them.
  if (typeof id !== 'string' || !id || id.length > 512 || id.trim() !== id) return '';
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F-\x9F\u2028\u2029]/u.test(id)) return '';
  return id;
}

export function sanitizeModelIds(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  const set = new Set<string>();
  for (const item of items) {
    const clean = sanitizeModelId(item);
    if (clean) set.add(clean);
  }
  return Array.from(set);
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
  if (sanitizeModelId(model) !== model) return { ok: false, error: 'Invalid model identifier' };
  if (apiKey.length > 4096) return { ok: false, error: 'API key is too long' };

  return { ok: true, value: { prompt, model, apiKey, settings } };
}

export function boundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/** Decode one URI or JSON representation, retaining original UTF-16 spans. */
function decodedDiagnostic(message: string, format: 'percent' | 'json') {
  const characters: string[] = [];
  const starts: number[] = [];
  const ends: number[] = [];
  for (let start = 0; start < message.length;) {
    let value = message[start];
    let end = start + 1;
    if (format === 'percent' && message[start] === '%' && /^[0-9a-f]{2}$/i.test(message.slice(start + 1, start + 3))) {
      const byte = Number.parseInt(message.slice(start + 1, start + 3), 16);
      const byteLength = byte < 0x80 ? 1 : byte >= 0xc2 && byte <= 0xdf ? 2
        : byte >= 0xe0 && byte <= 0xef ? 3 : byte >= 0xf0 && byte <= 0xf4 ? 4 : 0;
      const encoded = message.slice(start, start + byteLength * 3);
      if (byteLength && encoded.length === byteLength * 3 && /^(?:%[0-9a-f]{2}){1,4}$/i.test(encoded)) {
        try {
          value = decodeURIComponent(encoded);
          end = start + encoded.length;
        } catch {
          // Preserve invalid/truncated UTF-8 rather than consume a later valid span.
        }
      }
    }
    if (format === 'json' && message[start] === '\\') {
      const escape = message[start + 1];
      const shortEscapes: Record<string, string> = {
        '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t',
      };
      if (Object.hasOwn(shortEscapes, escape)) {
        value = shortEscapes[escape];
        end = start + 2;
      } else if (escape === 'u' && /^[0-9a-f]{4}$/i.test(message.slice(start + 2, start + 6))) {
        value = String.fromCharCode(Number.parseInt(message.slice(start + 2, start + 6), 16));
        end = start + 6;
      }
    }
    characters.push(value);
    for (let index = 0; index < value.length; index++) {
      starts.push(start);
      ends.push(end);
    }
    start = end;
  }
  return { text: characters.join(''), starts, ends };
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
  // Drop oversized diagnostics rather than truncate through a possible secret.
  // This also bounds match storage when the accepted key is only one character.
  if (message.length > 16_384) message = 'Error details exceeded the diagnostic limit';

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

  const keys = typeof keysToRedact === 'string' ? [keysToRedact] : Array.isArray(keysToRedact) ? keysToRedact : [];
  const variants = new Set<string>();
  for (const key of keys) {
    if (typeof key !== 'string') continue;
    // Every nonempty accepted key is sensitive, including one-character keys.
    for (const value of [key, sanitizeApiKey(key)]) {
      if (!value) continue;
      variants.add(value);
      variants.add(JSON.stringify(value).slice(1, -1));
    }
  }
  for (const value of variants) {
    for (let index = message.indexOf(value); index !== -1; index = message.indexOf(value, index + 1)) {
      ranges.push({ start: index, end: index + value.length });
    }
  }
  for (const format of ['percent', 'json'] as const) {
    if (!variants.size || (format === 'percent' ? !/%[0-9a-f]{2}/i.test(message) : !message.includes('\\'))) continue;
    const decoded = decodedDiagnostic(message, format);
    for (const value of variants) {
      for (let index = decoded.text.indexOf(value); index !== -1; index = decoded.text.indexOf(value, index + 1)) {
        ranges.push({ start: decoded.starts[index], end: decoded.ends[index + value.length - 1] });
      }
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
  result += message.slice(cursor);
  // A marker or replacement boundary can itself contain a supplied credential.
  // Suppress that diagnostic instead of repeatedly redacting replacement text.
  return [...variants].some((value) => result.includes(value)) ? '' : result;
}
