import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { callModelApi } from './modelApi';

const params = { provider: 'openai', model: 'synthetic-model', prompt: 'hello', apiKey: 'abc' };

describe('model API credential boundaries', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('redacts returned upstream errors through the real provider adapter', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Rejected abc; Bearer synthetic-token', { status: 401 })));
    const result = await callModelApi(params);
    expect(result.error).toBe('HTTP 401: Rejected [REDACTED]; Bearer [REDACTED]');
    expect(result.output).toBeNull();
  });

  it.each([
    ['synthetic/+key', 'synthetic%2f%2bkey'],
    ['synthetic-key', 'synthetic%2Dkey'],
    ['synthetic/+key', 'synthetic%2F+key'],
  ])('redacts percent encodings in returned provider errors (%s)', async (key, encoded) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(`Rejected ${encoded}`, { status: 401 })));
    const result = await callModelApi({ ...params, apiKey: key });
    expect(result.error).toBe('HTTP 401: Rejected [REDACTED]');
  });

  it.each([
    ['synthetic/+key', 'synthetic%2f%2Bkey'],
    ['synthetic-key', 'synthetic%2Dkey'],
    ['synthetic/+key', 'synthetic%2F+key'],
  ])('redacts percent encodings in thrown errors, logs and alerts (%s)', async (key, encoded) => {
    const alertMock = vi.fn();
    vi.stubGlobal('window', {});
    vi.stubGlobal('alert', alertMock);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error(`Rejected ${encoded}`)));
    const result = await callModelApi({ ...params, apiKey: key });
    expect(result.error).toBe('Rejected [REDACTED]');
    expect(console.error).toHaveBeenCalledExactlyOnceWith('Model API error:', 'Rejected [REDACTED]');
    expect(alertMock).toHaveBeenCalledExactlyOnceWith('Model API error: Rejected [REDACTED]');
  });

  it('redacts thrown failures in returned errors, logs, and browser alerts', async () => {
    const alertMock = vi.fn();
    vi.stubGlobal('window', {});
    vi.stubGlobal('alert', alertMock);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Rejected abc')));
    const result = await callModelApi(params);
    expect(result.error).toBe('Rejected [REDACTED]');
    expect(console.error).toHaveBeenCalledExactlyOnceWith('Model API error:', 'Rejected [REDACTED]');
    expect(alertMock).toHaveBeenCalledExactlyOnceWith('Model API error: Rejected [REDACTED]');
  });

  it('preserves successful output and usage without treating completion text as an error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      choices: [{ message: { content: 'alphabet abc' } }],
      usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 },
    })));
    const result = await callModelApi(params);
    expect(result.output).toBe('alphabet abc');
    expect(result.totalTokens).toBe(5);
    expect(result.error).toBeUndefined();
    expect(console.error).not.toHaveBeenCalled();
  });
});
