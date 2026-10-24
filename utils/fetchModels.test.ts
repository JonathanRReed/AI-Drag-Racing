import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchTogetherModels, fetchGroqModels } from './fetchModels';

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

  it('redacts sensitive credentials when logging fetch failure warnings', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed with sk-groq-secret-key')));

    const models = await fetchGroqModels('sk-groq-secret-key');
    expect(models).toBeDefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      '[Groq] fetchGroqModels failed, using static fallback:',
      expect.stringMatching(/\[REDACTED\]/),
    );
    expect(consoleSpy.mock.calls[0][1]).not.toContain('sk-groq-secret-key');
  });
});
