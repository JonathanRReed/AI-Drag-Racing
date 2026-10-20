import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchTogetherModels } from './fetchModels';

afterEach(() => vi.unstubAllGlobals());

describe('Together model discovery', () => {
  it('uses the same-origin provider proxy, not a direct browser provider request', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: ['example/model'] })));
    vi.stubGlobal('fetch', fetcher);
    expect(await fetchTogetherModels(' test-key ')).toEqual(['example/model']);
    expect(fetcher).toHaveBeenCalledWith('/api/models', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ providerId: 'together', apiKey: 'test-key' }),
    }));
  });

  it('redacts sensitive API keys in console.error when fetchViaProxy encounters an error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const secretKey = 'sk-proj-secret123key';
    const fetcher = vi.fn().mockRejectedValue(new Error(`Connection failed with key ${secretKey}`));
    vi.stubGlobal('fetch', fetcher);

    await expect(fetchTogetherModels(secretKey)).rejects.toThrow();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Fetch failed for together:',
      expect.stringContaining('[REDACTED]')
    );
    expect(consoleSpy.mock.calls.flat().join(' ')).not.toContain(secretKey);
    consoleSpy.mockRestore();
  });
});
