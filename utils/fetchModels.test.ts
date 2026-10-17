import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchGroqModels, fetchTogetherModels } from './fetchModels';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Together model discovery', () => {
  it('uses the same-origin provider proxy, not a direct browser provider request', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: ['example/model'] })));
    vi.stubGlobal('fetch', fetcher);
    expect(await fetchTogetherModels(' test-key ')).toEqual(['example/model']);
    expect(fetcher).toHaveBeenCalledWith('/api/models', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ providerId: 'together', apiKey: 'test-key' }),
    }));
  });

  it('redacts credentials when error logging occurs in fetchViaProxy and fallbacks', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const secretKey = 'sk-proj-secret12345';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error(`Failed with key ${secretKey}`)));

    await expect(fetchGroqModels(secretKey)).resolves.toBeDefined();

    expect(consoleErrorSpy).toHaveBeenCalled();
    const errorLogMsg = consoleErrorSpy.mock.calls.flat().join(' ');
    expect(errorLogMsg).not.toContain(secretKey);
    expect(errorLogMsg).toContain('[REDACTED]');

    expect(consoleWarnSpy).toHaveBeenCalled();
    const warnLogMsg = consoleWarnSpy.mock.calls.flat().join(' ');
    expect(warnLogMsg).not.toContain(secretKey);
    expect(warnLogMsg).toContain('[REDACTED]');
  });
});
