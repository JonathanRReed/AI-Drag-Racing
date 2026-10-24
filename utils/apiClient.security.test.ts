import { afterEach, describe, expect, it, vi } from 'vitest';
import { streamCompletion } from './apiClient';

async function errorFor(apiKey: string, body: string, status = 401) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status })));
  const stream = streamCompletion('synthetic-provider', 'hello', 'synthetic-model', apiKey);
  const error = await stream.next().then(() => null, (value: unknown) => value);
  expect(error).toBeInstanceOf(Error);
  return error as Error;
}

describe('completion client credential boundaries', () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each(['k', 'xy', 'abc', 'synthetic/+key'])('redacts every accepted explicit key in an HTTP error (%s)', async (key) => {
    const error = await errorFor(key, `Rejected ${key}; Bearer synthetic-token`);
    expect(error.message).toBe('API Error (401): Rejected [REDACTED]; Bearer [REDACTED]');
    expect(error.stack?.split('\n')[0]).not.toContain(key);
  });

  it.each([
    ['synthetic/+key', 'synthetic%2f%2Bkey'],
    ['synthetic-key', 'synthetic%2Dkey'],
    ['synthetic/key', String.raw`synthetic\/key`],
    ['synthetic-key', String.raw`synthetic\u002Dkey`],
    [' "synthetic-key" ', 'synthetic-key'],
  ])('redacts encoded and normalized HTTP diagnostics (%s)', async (key, echoed) => {
    const error = await errorFor(key, `Rejected ${echoed}`);
    expect(error.message).toBe('API Error (401): Rejected [REDACTED]');
    expect(error.stack).not.toContain(echoed);
  });

  it.each(['A', 'R', '[REDACTED]'])('preserves marker-collision suppression (%s)', async (key) => {
    const error = await errorFor(key, `Rejected ${key}`);
    expect(error.message).toBe('');
  });

  it.each(['connect', 'API', '401'])('redacts the entire fallback diagnostic too (%s)', async (key) => {
    const error = await errorFor(key, '');
    expect(error.message).not.toContain(key);
    expect(error.message).toContain('[REDACTED]');
  });

  it('redacts the successful-response-without-body error branch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200, body: null,
      text: async () => 'Rejected synthetic-token',
    }));
    await expect(streamCompletion('synthetic-provider', 'hello', 'synthetic-model', 'synthetic-token').next())
      .rejects.toThrow('API Error (200): Rejected [REDACTED]');
  });
});
