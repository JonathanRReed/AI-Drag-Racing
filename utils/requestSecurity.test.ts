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

describe('redactCredentials', () => {
  it('redacts explicit API keys', () => {
    expect(redactCredentials('Error connecting with key my-secret-api-key-1234', 'my-secret-api-key-1234'))
      .toBe('Error connecting with key [REDACTED]');
  });

  it('redacts sk-*, AKIA*, and Bearer tokens via pattern matching', () => {
    expect(redactCredentials('Failed with sk-proj1234567890abcdef'))
      .toBe('Failed with [REDACTED]');
    expect(redactCredentials('AWS auth failed for AKIAIOSFODNN7EXAMPLE'))
      .toBe('AWS auth failed for [REDACTED]');
    expect(redactCredentials('Header Authorization: Bearer secrettoken123456'))
      .toBe('Header Authorization: Bearer [REDACTED]');
  });

  it('handles Error objects and plain objects', () => {
    const err = new Error('HTTP 401 with sk-1234567890');
    expect(redactCredentials(err)).toBe('HTTP 401 with [REDACTED]');

    const obj = { message: 'Failed Bearer abc123def456' };
    expect(redactCredentials(obj)).toBe('{"message":"Failed Bearer [REDACTED]"}');
  });
});
