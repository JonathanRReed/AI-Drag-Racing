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

  it('redacts lowercase percent escapes in returned provider errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Rejected synthetic%2f%2bkey', { status: 401 })));
    const result = await callModelApi({ ...params, apiKey: 'synthetic/+key' });
    expect(result.error).toBe('HTTP 401: Rejected [REDACTED]');
  });

  it('redacts mixed percent escapes in thrown errors, logs and alerts', async () => {
    const alertMock = vi.fn();
    vi.stubGlobal('window', {});
    vi.stubGlobal('alert', alertMock);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Rejected synthetic%2f%2Bkey')));
    const result = await callModelApi({ ...params, apiKey: 'synthetic/+key' });
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
