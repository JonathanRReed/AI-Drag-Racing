import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../pages/api/models';

const ORIGIN = 'https://ai-dragrace.jonathanrreed.com';
const PRIVATE_DETAIL = 'synthetic-private-upstream-detail';

function request(providerId: string) {
  return new Request(ORIGIN + '/api/models', {
    method: 'POST',
    headers: { origin: ORIGIN },
    body: JSON.stringify({ providerId, apiKey: 'synthetic-key' }),
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

  it('uses a static fallback after a provider fetch failure without logging its details', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error(PRIVATE_DETAIL));
    vi.stubGlobal('fetch', fetchMock);
    const response = await handler(request('openai'));
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect((await response.json()).data.length).toBeGreaterThan(0);
    expect(console.warn).toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
    expect(vi.mocked(console.warn).mock.calls.flat().join(' ')).not.toContain(PRIVATE_DETAIL);
  });

  it('rejects disallowed origins with 403 and includes nosniff header', async () => {
    const req = new Request(ORIGIN + '/api/models', {
      method: 'POST',
      headers: { origin: 'https://attacker.example' },
      body: JSON.stringify({ providerId: 'openai', apiKey: 'synthetic-key' }),
    });
    const response = await handler(req);
    expect(response.status).toBe(403);
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(await response.json()).toEqual({ data: [], error: 'Origin not allowed' });
  });

  it('rejects invalid methods with 405 and includes nosniff header', async () => {
    const req = new Request(ORIGIN + '/api/models', {
      method: 'GET',
      headers: { origin: ORIGIN },
    });
    const response = await handler(req);
    expect(response.status).toBe(405);
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(await response.json()).toEqual({ data: [], error: 'Method not allowed' });
  });

  it.each([
    [new Error(PRIVATE_DETAIL), 'Failed to fetch models'],
    [new Error('401 ' + PRIVATE_DETAIL), 'Invalid API Key'],
    [new Error('403 ' + PRIVATE_DETAIL), 'Invalid API Key'],
    [{ message: 401 }, 'Failed to fetch models'],
    [null, 'Failed to fetch models'],
  ])('omits upstream details when the outer catch handles failure %#', async (failure, expectedError) => {
    const req = request('unknown-provider');
    // Provider fetch rejections are caught internally. A one-shot response
    // serialization failure exercises the outer catch and its real log sink.
    const stringify = vi.spyOn(JSON, 'stringify').mockImplementationOnce(() => { throw failure; });
    const response = await handler(req);
    expect(stringify).toHaveBeenNthCalledWith(1, { data: [] });
    expect(stringify).toHaveBeenLastCalledWith({ data: [], error: expectedError });
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

  it('does not treat inherited object properties as provider fallbacks', async () => {
    const req = request('constructor');
    vi.spyOn(JSON, 'stringify').mockImplementationOnce(() => { throw new Error(PRIVATE_DETAIL); });
    const response = await handler(req);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ data: [], error: 'Failed to fetch models' });
  });

  it('sanitizes and deduplicates model IDs returned by external APIs', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        data: [
          { id: '  gpt-4o\r\n ' },
          { id: 'gpt-4o' },
          { id: 'claude\x00-sonnet' },
          { id: 12345 },
          { id: null },
        ],
      }))
    );
    vi.stubGlobal('fetch', fetchMock);
    const response = await handler(request('openai'));
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data).toContain('gpt-4o');
    expect(json.data).toContain('claude-sonnet');
    expect(json.data.filter((id: string) => id === 'gpt-4o').length).toBe(1);
    expect(json.data.every((id: string) => typeof id === 'string' && id.trim() === id)).toBe(true);
  });
});
