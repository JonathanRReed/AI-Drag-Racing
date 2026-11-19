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
    'openai\r\nLogInjection',
    'provider<script>',
    'provider id with spaces',
    'provider/with/slashes',
    'provider\x00null',
  ])('rejects invalid provider IDs (%j) with 400 status', async (invalidProviderId) => {
    const req = new Request(ORIGIN + '/api/models', {
      method: 'POST',
      headers: { origin: ORIGIN },
      body: JSON.stringify({ providerId: invalidProviderId, apiKey: 'synthetic-key' }),
    });
    const response = await handler(req);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ data: [], error: 'Valid provider ID required' });
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

  it('rejects malformed model IDs without inventing replacement identities', async () => {
    const rawUpstreamData = {
      data: [
        { id: '  gpt-4o\r\n  ' },
        { id: 'gpt-4o' },
        { id: 'claude-3-5-sonnet\x00' },
        { id: 'upstream-valid' },
        null,
        { id: null },
        { invalid: 'no id field' },
      ],
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(rawUpstreamData))));
    const response = await handler(request('openai'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toContain('gpt-4o');
    expect(body.data).not.toContain('claude-3-5-sonnet');
    expect(body.data).toContain('upstream-valid');
    expect(body.data.filter((id: string) => id === 'gpt-4o').length).toBe(1);
    // eslint-disable-next-line no-control-regex
    expect(body.data.every((id: string) => typeof id === 'string' && id.length > 0 && !/[\x00-\x1F\x7F]/.test(id))).toBe(true);
  });

  it.each(['anthropic', 'moonshot', 'groq', 'openai'])(
    'preserves valid %s entries beside null and malformed entries', async (provider) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
        data: [null, 7, {}, { id: 'upstream-valid' }, { id: 'invented\x00alias' }, { id: 'x'.repeat(513) }],
      }))));
      const response = await handler(request(provider));
      const body = await response.json();
      expect(body.data).toContain('upstream-valid');
      expect(body.data).not.toContain('inventedalias');
      expect(body.data).not.toContain('x'.repeat(512));
      expect(console.warn).not.toHaveBeenCalled();
    },
  );

  it.each([
    { payload: [null, { id: 'upstream-valid' }] },
    { payload: { models: [null, { name: 'upstream-valid' }, { name: 'bad\x00id' }] } },
  ])('accepts supported response shapes without trusting every entry %#', async ({ payload }) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(payload))));
    const body = await (await handler(request('openai'))).json();
    expect(body.data).toContain('upstream-valid');
    expect(body.data).not.toContain('badid');
  });
});
