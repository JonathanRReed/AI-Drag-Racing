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

  it.each([
    ['synthetic-key', 'synthetic%2Dkey'],
    ['synthetic/+key', 'synthetic%2F+key'],
    ['synthetic/+key', '%73ynthetic/%2bkey'],
    ['k', '%6b'],
    ['synthetic-key', '%73%79%6e%74%68%65%74%69%63%2d%6b%65%79'],
    ['Synthetic/éKey', 'Synthetic/%c3%A9Key'],
  ])('redacts selectively encoded and unreserved credential bytes (%s)', (key, encoded) => {
    expect(redactCredentials(`Rejected ${encoded}; repeated ${encoded}`, key))
      .toBe('Rejected [REDACTED]; repeated [REDACTED]');
  });

  it('maps UTF-8 surrogate pairs back to full original spans beside malformed escapes', () => {
    expect(redactCredentials('prefix %FF: synthetic%2D%f0%9F%94%90key tail %e0%80', 'synthetic-🔐key'))
      .toBe('prefix %FF: [REDACTED] tail %e0%80');
  });

  it.each(['%e0%80', '%ed%a0%80', '%f0%9f', '%c0%af', '%ff'])('preserves invalid UTF-8 before a valid encoded credential (%s)', (invalid) => {
    const encoded = '%73%79%6e%74%68%65%74%69%63%2d%6b%65%79';
    expect(redactCredentials(`prefix ${invalid}${encoded} suffix`, 'synthetic-key'))
      .toBe(`prefix ${invalid}[REDACTED] suffix`);
  });

  it('does not consume a valid Unicode credential after a truncated UTF-8 prefix', () => {
    expect(redactCredentials('Rejected %c3%c3%a9key', 'ékey')).toBe('Rejected %c3[REDACTED]');
  });

  it('decodes once and preserves case inside a literal percent-containing key', () => {
    expect(redactCredentials('Rejected %252f%2Dkey', '%2f-key')).toBe('Rejected [REDACTED]');
    expect(redactCredentials('Rejected %252F%2Dkey', '%2f-key')).toBe('Rejected %252F%2Dkey');
    expect(redactCredentials('Rejected synthetic%252Dkey', 'synthetic-key')).toBe('Rejected synthetic%252Dkey');
  });

  it('preserves malformed percent escapes that are not a representation of the key', () => {
    expect(redactCredentials('Rejected synthetic%2Gkey; trailing %', 'synthetic-key'))
      .toBe('Rejected synthetic%2Gkey; trailing %');
  });

  it('merges selectively encoded overlapping credentials over their original spans', () => {
    expect(redactCredentials('Rejected synthetic%2Dkey', ['synthetic-', 'synthetic-key']))
      .toBe('Rejected [REDACTED]');
  });

  it.each([
    ['synthetic/key', String.raw`synthetic\/key`],
    ['synthetic-key', String.raw`synthetic\u002Dkey`],
    ['synthetic-key', String.raw`\u0073ynthetic\u002dkey`],
    ['synthetic/éKey', String.raw`synthetic\/\u00e9Key`],
    ['synthetic-🔐key', String.raw`synthetic-\uD83D\uDD10key`],
    ['k', String.raw`\u006b`],
    ['synthetic"\\key', String.raw`synthetic\u0022\u005ckey`],
  ])('redacts valid noncanonical JSON escape forms (%s)', (key, encoded) => {
    expect(redactCredentials(`Rejected ${encoded}; repeated ${encoded}`, key))
      .toBe('Rejected [REDACTED]; repeated [REDACTED]');
  });

  it.each([String.raw`\u00GG`, String.raw`\u12`, String.raw`\x73`])('preserves invalid JSON escapes beside valid encoded secrets (%s)', (invalid) => {
    expect(redactCredentials(`prefix ${invalid}${String.raw`synthetic\u002Dkey`} suffix`, 'synthetic-key'))
      .toBe(`prefix ${invalid}[REDACTED] suffix`);
  });

  it('decodes JSON escapes once without treating escaped backslashes as nested escapes', () => {
    expect(redactCredentials(String.raw`Rejected synthetic\\u002Dkey`, 'synthetic-key'))
      .toBe(String.raw`Rejected synthetic\\u002Dkey`);
    expect(redactCredentials(String.raw`Rejected synthetic\\u002Dkey`, String.raw`synthetic\u002Dkey`))
      .toBe('Rejected [REDACTED]');
  });

  it('merges JSON-escaped overlapping keys over their original source spans', () => {
    expect(redactCredentials(String.raw`Rejected synthetic\u002Dkey`, ['synthetic-', 'synthetic-key']))
      .toBe('Rejected [REDACTED]');
  });

  it.each(['[REDACTED]', 'R', '[', 'D]'])('suppresses diagnostics when the marker would contain a supplied key (%s)', (key) => {
    expect(redactCredentials(`Rejected ${key}`, key)).toBe('');
  });

  it('suppresses a supplied key created across a replacement boundary', () => {
    expect(redactCredentials('synthetic-tail', ['synthetic', '[REDACTED]-tail'])).toBe('');
  });

  it('sanitizes the oversized diagnostic fallback with the same key policy', () => {
    expect(redactCredentials('x'.repeat(16_385), 'Error')).not.toContain('Error');
    expect(redactCredentials('x'.repeat(16_385), 'R')).toBe('Error details exceeded the diagnostic limit');
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
