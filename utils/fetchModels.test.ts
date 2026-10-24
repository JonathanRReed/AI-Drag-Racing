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
});
