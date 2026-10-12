import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../pages/api/providers/[providerId]/completions';
import { registerProviderService } from '../utils/providerService';

function request(providerId = 'openai', apiKey = 'abc') {
  return new Request(`https://ai-dragrace.jonathanrreed.com/api/providers/${providerId}/completions`, {
    method: 'POST',
    body: JSON.stringify({ prompt: 'hello', model: 'synthetic-model', apiKey }),
  });
}

async function events(response: Response) {
  return (await response.text()).split('\n\n').filter(Boolean).map((line) => JSON.parse(line.slice(6)));
}

describe('completion stream credential boundaries', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(['k', 'xy', 'abc', 'synthetic/+key'])('redacts upstream HTTP error bodies for accepted key %s', async (key) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(`Rejected ${key}; Bearer synthetic-token`, { status: 401 })));
    const response = await handler(request('openai', key));
    const received = await events(response);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(received).toHaveLength(2);
    expect(received[0].type).toBe('meta');
    expect(received[1]).toEqual({ type: 'error', message: 'OpenAI API error: 401 Rejected [REDACTED]; Bearer [REDACTED]' });
  });

  it('includes X-Content-Type-Options security header on API responses', async () => {
    const invalidMethodRequest = new Request('https://ai-dragrace.jonathanrreed.com/api/providers/openai/completions', { method: 'GET' });
    const response = await handler(invalidMethodRequest);
    expect(response.status).toBe(405);
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it.each([
    { name: 'disallowed origin', status: 403, path: 'openai', body: '{}', headers: { origin: 'https://untrusted.example' }, error: 'Origin not allowed' },
    { name: 'invalid provider path', status: 400, path: '', body: '{}', headers: {}, error: 'Invalid provider ID' },
    { name: 'missing body', status: 400, path: 'openai', body: undefined, headers: {}, error: 'Request body is required' },
    { name: 'malformed JSON', status: 400, path: 'openai', body: '{', headers: {}, error: 'Invalid JSON body' },
    { name: 'invalid request fields', status: 400, path: 'openai', body: '{}', headers: {}, error: 'Missing prompt, model, or API key' },
    { name: 'declared oversized body', status: 413, path: 'openai', body: '{}', headers: { 'content-length': '131073' }, error: 'Request body exceeds the 131,072 byte limit' },
    { name: 'streamed oversized body', status: 413, path: 'openai', body: 'x'.repeat(131073), headers: {}, error: 'Request body exceeds the 131,072 byte limit' },
    { name: 'unsupported provider', status: 404, path: 'unsupported-provider', body: JSON.stringify({ prompt: 'hello', model: 'synthetic-model', apiKey: 'synthetic-key' }), headers: {}, error: "Provider 'unsupported-provider' not found" },
  ])('keeps nosniff and response semantics for $name ($status)', async ({ status, path, body, headers, error }) => {
    const upstream = vi.fn(() => { throw new Error('Unexpected provider call'); });
    vi.stubGlobal('fetch', upstream);
    const response = await handler(new Request(`https://ai-dragrace.jonathanrreed.com/api/providers/${path}/completions`, {
      method: 'POST', body, headers: new Headers(headers as Record<string, string>),
    }));
    expect(response.status).toBe(status);
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(response.headers.get('vary')).toBe('Origin');
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(await response.json()).toEqual({ error });
    expect(upstream).not.toHaveBeenCalled();
  });

  it.each([
    ['synthetic/+key', 'synthetic%2f%2bkey'],
    ['synthetic/+key', 'synthetic%2F%2bkey'],
    ['synthetic-key', 'synthetic%2Dkey'],
    ['synthetic/key', String.raw`synthetic\/key`],
    ['synthetic-key', String.raw`synthetic\u002Dkey`],
    ['synthetic/+key', 'synthetic%2F+key'],
  ])('redacts percent-encoded credentials in SSE errors (%s)', async (key, encoded) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(`Rejected ${encoded}`, { status: 401 })));
    const received = await events(await handler(request('openai', key)));
    expect(received[1]).toEqual({ type: 'error', message: 'OpenAI API error: 401 Rejected [REDACTED]' });
  });

  it('keeps an intentionally suppressed marker-collision SSE diagnostic empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Rejected [REDACTED]', { status: 401 })));
    const received = await events(await handler(request('openai', '[REDACTED]')));
    expect(received[1]).toEqual({ type: 'error', message: '' });
  });

  it('redacts provider-yielded errors as well as thrown failures', async () => {
    registerProviderService({
      providerId: 'synthetic-error-provider',
      async getModels() { return []; },
      async *generate() {
        yield { type: 'error', message: 'Rejected abc' };
      },
    });
    const received = await events(await handler(request('synthetic-error-provider')));
    expect(received[1]).toEqual({ type: 'error', message: 'Rejected [REDACTED]' });
  });

  it('keeps harmless chunks and metrics unchanged', async () => {
    registerProviderService({
      providerId: 'synthetic-success-provider',
      async getModels() { return []; },
      async *generate() {
        yield { type: 'chunk', content: 'alphabet abc' };
        yield { type: 'metrics', data: { startTime: 1, finishTime: 2, tokenCount: 3 } };
      },
    });
    const received = await events(await handler(request('synthetic-success-provider')));
    expect(received[1]).toEqual({ type: 'chunk', content: 'alphabet abc' });
    expect(received[2]).toMatchObject({ type: 'metrics', data: { startTime: 1, finishTime: 2, tokenCount: 3 } });
  });
});
