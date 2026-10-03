import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../pages/api/models';

const ORIGIN = 'https://ai-dragrace.jonathanrreed.com';
const PRIVATE_DETAIL = 'dummy-provider-credential-do-not-log';

function request(providerId: string) {
  return new Request(ORIGIN + '/api/models', {
    method: 'POST',
    headers: { origin: ORIGIN },
    body: JSON.stringify({ providerId, apiKey: 'test-key' }),
  });
}

describe('models proxy error handling', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('rejects forbidden origins', async () => {
    const response = await handler(new Request(ORIGIN + '/api/models', {
      method: 'POST',
      headers: { origin: 'https://evil.com' },
    }));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ data: [], error: 'Origin not allowed' });
  });

  it('uses a static fallback after a provider fetch failure without logging its details', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error(PRIVATE_DETAIL));
    vi.stubGlobal('fetch', fetchMock);
    const response = await handler(request('openai'));
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    expect((await response.json()).data.length).toBeGreaterThan(0);
    expect(console.warn).toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
    expect(vi.mocked(console.warn).mock.calls.flat().join(' ')).not.toContain(PRIVATE_DETAIL);
  });

  it.each([
    [new Error(PRIVATE_DETAIL), 'Failed to fetch models'],
    [new Error('401 ' + PRIVATE_DETAIL), 'Invalid API Key'],
    [new Error('403 ' + PRIVATE_DETAIL), 'Invalid API Key'],
    [{ message: 401 }, 'Failed to fetch models'],
    [null, 'Failed to fetch models'],
  ])('sanitizes an outer-catch failure %#', async (failure, expectedError) => {
    const req = request('unknown-provider');
    // Provider fetch failures are caught internally. A response serialization
    // failure reaches the outer catch; only the first serialization fails.
    const stringify = vi.spyOn(JSON, 'stringify').mockImplementationOnce(() => { throw failure; });
    const response = await handler(req);
    expect(stringify).toHaveBeenCalledTimes(2);
    expect(console.error).toHaveBeenCalledExactlyOnceWith('[Proxy Error] Provider: unknown-provider');
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ data: [], error: expectedError });
  });

  it('keeps the static fallback when the outer catch handles a failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"data":[]}')));
    const req = request('openai');
    vi.spyOn(JSON, 'stringify').mockImplementationOnce(() => { throw new Error(PRIVATE_DETAIL); });
    const response = await handler(req);
    expect(console.error).toHaveBeenCalledExactlyOnceWith('[Proxy Error] Provider: openai');
    expect(response.status).toBe(200);
    expect((await response.json()).data.length).toBeGreaterThan(0);
  });
});
