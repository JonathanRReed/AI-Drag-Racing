import { describe, expect, it } from 'vitest';
import { boundedNumber, corsHeadersForRequest, isAllowedRequestOrigin, readJsonBodyWithLimit, redactCredentials, sanitizeApiKey, validateRaceRequestBody } from './requestSecurity';

function request(url: string, origin?: string) {
  return new Request(url, { headers: origin ? { origin } : {} });
}

describe('request security', () => {
  it('accepts the production origin and rejects foreign browser origins', () => {
    expect(isAllowedRequestOrigin(request(
      'https://ai-dragrace.jonathanrreed.com/api/models',
      'https://ai-dragrace.jonathanrreed.com',
    ))).toBe(true);
    expect(corsHeadersForRequest(request(
      'https://ai-dragrace.jonathanrreed.com/api/models',
      'https://attacker.example',
    ))).toBeNull();
  });

  it('allows loopback development across ports', () => {
    expect(isAllowedRequestOrigin(request('http://127.0.0.1:3000/api/models', 'http://localhost:62033'))).toBe(true);
  });

  it('bounds body sizes and settings', () => {
    expect(validateRaceRequestBody({ prompt: '', model: 'm', apiKey: 'k' }).ok).toBe(false);
    expect(validateRaceRequestBody({ prompt: 'x'.repeat(100_001), model: 'm', apiKey: 'k' }).ok).toBe(false);
    expect(validateRaceRequestBody({ prompt: 'hello', model: 'm', apiKey: 'k', settings: {} }).ok).toBe(true);
    expect(boundedNumber(10, 0.7, 0, 2)).toBe(2);
    expect(boundedNumber(Number.NaN, 0.7, 0, 2)).toBe(0.7);
  });

  it('sanitizes API keys removing quotes, whitespace, and control/CRLF characters', () => {
    expect(sanitizeApiKey('  "sk-123456"  ')).toBe('sk-123456');
    expect(sanitizeApiKey("'sk-7890'\r\n")).toBe('sk-7890');
    expect(sanitizeApiKey('sk-abc\x00def\r\nghi')).toBe('sk-abcdefghi');
    const res = validateRaceRequestBody({ prompt: 'hi', model: 'm', apiKey: ' "key-123\r\n" ' });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.apiKey).toBe('key-123');
    }
  });

  it('rejects oversized JSON before parsing an unbounded request body', async () => {
    const declared = new Request('https://ai-dragrace.jonathanrreed.com/api/models', {
      method: 'POST',
      headers: { 'content-length': '20000' },
      body: '{}',
    });
    expect(await readJsonBodyWithLimit(declared, 16_384)).toMatchObject({ ok: false, status: 413 });

    const streamed = new Request('https://ai-dragrace.jonathanrreed.com/api/models', {
      method: 'POST',
      body: JSON.stringify({ payload: 'x'.repeat(20_000) }),
    });
    expect(await readJsonBodyWithLimit(streamed, 16_384)).toMatchObject({ ok: false, status: 413 });
  });
});

describe('pasted API key boundaries', () => {
  it('removes boundary controls before trimming and unquoting', () => {
    expect(sanitizeApiKey('\x00 "sk-test-only" \x7F')).toBe('sk-test-only');
    expect(sanitizeApiKey('"sk-test-only"\x00')).toBe('sk-test-only');
    expect(sanitizeApiKey('\x00   \x7F')).toBe('');
  });
});

describe('credential redaction', () => {
  it.each(['k', 'xy', 'abc', 'synthetic-key', 'a.*+$[x]'])('redacts every occurrence of an explicit key regardless of length (%s)', (key) => {
    expect(redactCredentials(`Rejected ${key}; repeated ${key}`, key))
      .toBe('Rejected [REDACTED]; repeated [REDACTED]');
  });

  it('redacts the normalized, JSON-escaped, and URL-encoded forms of a pasted key', () => {
    const key = 'synthetic/+"\\key';
    const pasted = ` \x00'${key}'\r\n `;
    const message = [key, JSON.stringify(key).slice(1, -1), encodeURIComponent(key)].join(' ');
    expect(redactCredentials(message, pasted)).toBe('[REDACTED] [REDACTED] [REDACTED]');
  });

  it.each(['synthetic%2f%2bkey', 'synthetic%2F%2bkey', 'synthetic%2f%2Bkey'])('redacts case-insensitive percent triplets (%s)', (encoded) => {
    expect(redactCredentials(`Rejected ${encoded}; repeated ${encoded}`, 'synthetic/+key'))
      .toBe('Rejected [REDACTED]; repeated [REDACTED]');
  });

  it('redacts mixed-case UTF-8 escapes of a normalized pasted key', () => {
    expect(redactCredentials('Rejected Synthetic%2f%c3%A9Key', " 'Synthetic/éKey' "))
      .toBe('Rejected [REDACTED]');
  });

  it('keeps literal credential characters case-sensitive', () => {
    expect(redactCredentials('Rejected synthetic%2f%2bkey', 'Synthetic/+Key'))
      .toBe('Rejected synthetic%2f%2bkey');
  });

  it('keeps unmatched percent escapes unchanged while redacting encoded overlaps', () => {
    expect(redactCredentials('prefix %aB: synthetic%2f%2bkey suffix %cD', ['synthetic/+', 'synthetic/+key']))
      .toBe('prefix %aB: [REDACTED] suffix %cD');
  });

  it('redacts multiple explicit keys without exposing the suffix of an overlapping key', () => {
    expect(redactCredentials('short-key and short', ['short', 'short-key']))
      .toBe('[REDACTED] and [REDACTED]');
  });

  it('does not treat placeholders in the original message as trusted redactions', () => {
    const key = 'synthetic[REDACTED]key';
    expect(redactCredentials(`Rejected ${key}`, key)).toBe('Rejected [REDACTED]');
  });

  it.each([
    ['sk-proj-synthetic_123', '[REDACTED]'],
    ['gsk_synthetic_123', '[REDACTED]'],
    ['xai-synthetic_123', '[REDACTED]'],
    ['AKIAIOSFODNN7EXAMPLE', '[REDACTED]'],
    ['ASIAIOSFODNN7EXAMPLE', '[REDACTED]'],
    ['Authorization: bEaReR x', 'Authorization: bEaReR [REDACTED]'],
    ['Bearer synthetic._~+/-==', 'Bearer [REDACTED]'],
    ['api_key="synthetic/+key=" failed', 'api_key=[REDACTED] failed'],
    ['{"x-api-key":"synthetic-key"}', '{"x-api-key":[REDACTED]}'],
    ['?key=synthetic%2Bkey&model=m', '?key=[REDACTED]&model=m'],
    ['access_token=synthetic-token', 'access_token=[REDACTED]'],
  ])('scrubs recognizable credential syntax (%s)', (message, expected) => {
    expect(redactCredentials(message)).toBe(expected);
  });

  it('handles errors and plain thrown message objects without serializing other fields', () => {
    expect(redactCredentials(new Error('Rejected synthetic-key'), 'synthetic-key')).toBe('Rejected [REDACTED]');
    expect(redactCredentials({ message: 'Rejected abc', request: { password: 'private' } }, 'abc'))
      .toBe('Rejected [REDACTED]');
  });

  it('fails closed for unprintable and non-message objects', () => {
    const circular: Record<string, unknown> = { credential: 'synthetic-key' };
    circular.self = circular;
    expect(redactCredentials(circular)).toBe('Unknown error');
    expect(redactCredentials(Object.create(null))).toBe('Unknown error');
    expect(redactCredentials({ get message() { throw new Error('private'); } })).toBe('Unknown error');
    expect(redactCredentials({ toString() { return 'private'; } })).toBe('Unknown error');
    expect(redactCredentials({ message: 401 })).toBe('Unknown error');
  });

  it('preserves harmless diagnostics and safely handles absent inputs', () => {
    expect(redactCredentials('HTTP 429: retry later')).toBe('HTTP 429: retry later');
    expect(redactCredentials(null)).toBe('');
    expect(redactCredentials(undefined)).toBe('');
    expect(redactCredentials('', '')).toBe('');
  });

  it('drops oversized diagnostics before collecting matches for short keys', () => {
    expect(redactCredentials('k'.repeat(16_385), 'k')).toBe('Error details exceeded the diagnostic limit');
  });
});
