import { afterEach, describe, expect, it, vi } from 'vitest';
import worker, { apiRoutes } from '../worker/index';
import { registerProviderService } from '../utils/providerService';

const origin = 'https://ai-dragrace.jonathanrreed.com';
const apiPaths = ['/api/models', '/api/bedrock-models', '/api/providers/openai/completions'];
const env = () => ({ ASSETS: { fetch: vi.fn(async (req: Request) => new Response(['GET', 'HEAD'].includes(req.method) ? '<h1>Not found</h1>' : null, { status: ['GET', 'HEAD'].includes(req.method) ? 404 : 405, headers: { 'Content-Type': 'text/html' } })) } });
const request = (path: string, method = 'POST', options: RequestInit = {}) => new Request(`${origin}${path}`, { method, ...options });
const body = (apiKey = 'synthetic-key') => JSON.stringify({ prompt: 'hello', model: 'synthetic-model', apiKey });
const decode = (value: Uint8Array) => JSON.parse(new TextDecoder().decode(value).trim().slice(6));
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

afterEach(() => vi.unstubAllGlobals());

describe('native Pages routing contract', () => {
  it.each(apiPaths)('preserves methods, OPTIONS and HEAD for %s', async (path) => {
    const assets = env();
    for (const method of ['GET', 'PUT', 'PATCH', 'DELETE', 'HEAD']) {
      const response = await worker.fetch(request(path, method), assets);
      expect(response.status).toBe(405);
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('x-frame-options')).toBe('DENY');
      expect(response.headers.get('x-xss-protection')).toBe('0');
      expect(response.headers.get('vary')).toBe('Origin');
      if (method === 'HEAD') expect(await response.text()).toBe('');
      else expect(await response.json()).toMatchObject({ error: 'Method not allowed' });
    }
    const preflight = await worker.fetch(request(path, 'OPTIONS', { headers: { origin } }), assets);
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-origin')).toBe(origin);
    expect(preflight.headers.get('access-control-allow-methods')).toBe('POST, OPTIONS');
    expect(await preflight.text()).toBe('');
    expect(assets.ASSETS.fetch).not.toHaveBeenCalled();
  });

  it.each(apiPaths)('checks origin before method handling for %s', async (path) => {
    const response = await worker.fetch(request(path, 'OPTIONS', { headers: { origin: 'https://untrusted.example' } }), env());
    expect(response.status).toBe(403);
    expect(response.headers.has('access-control-allow-origin')).toBe(false);
  });

  it.each([...apiPaths, '/api/unknown'])('preserves trailing slash redirect and query for %s', async (path) => {
    const assets = env();
    const response = await worker.fetch(request(`${path}/?x=1&x=2&encoded=%2F`, 'POST', { body: '{}' }), assets);
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(`${path}?x=1&x=2&encoded=%2F`);
    expect(await response.text()).toBe('');
    expect(assets.ASSETS.fetch).not.toHaveBeenCalled();
  });

  it('retains adapter redirect query serialization and duplicate-identical-pair removal', async () => {
    const response = await worker.fetch(request('/api/models/?x=1&x=1&space=a%20b&slash=%2f', 'GET'), env());
    expect(response.headers.get('location')).toBe('/api/models?x=1&space=a+b&slash=%2F');
  });

  it('routes POST with a query string without changing handler behavior', async () => {
    const response = await worker.fetch(request('/api/bedrock-models?providerId=anything', 'POST'), env());
    expect(response.status).toBe(200);
    expect((await response.json()).models).toContain('amazon.titan-text-lite-v1');
  });

  it.each(['/api', '/api/unknown', '/api/models/extra', '/api/providers//completions', '/api/providers/openai/completions/extra', '/api/providers/openai/other', '/api/Models', '/api/models//', '/api//models/'])('keeps unknown API path %s a 404, never a partial handler match', async (path) => {
    const upstream = vi.fn(() => { throw new Error('No provider calls permitted'); });
    vi.stubGlobal('fetch', upstream);
    for (const method of ['GET', 'POST', 'HEAD', 'OPTIONS']) {
      const assets = env();
      const response = await worker.fetch(request(path, method), assets);
      expect(response.status).toBe(404);
      expect(response.headers.get('content-type')).toBe('text/html');
      expect(await response.text()).toBe(method === 'GET' ? '<h1>Not found</h1>' : '');
    }
    expect(upstream).not.toHaveBeenCalled();
  });


  it('preserves the prior dynamic case matcher without decoding or lowercasing provider IDs', async () => {
    for (const path of ['/api/Providers/openai/completions', '/api/providers/openai/Completions']) {
      expect((await worker.fetch(request(path, 'OPTIONS'), env())).status).toBe(204);
      const response = await worker.fetch(request(path, 'POST', { body: body() }), env());
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'Invalid provider ID' });
    }
    for (const id of ['OpenAI', 'openai%2Fextra', 'openai%5Cextra']) {
      const response = await worker.fetch(request(`/api/providers/${id}/completions`, 'POST', { body: body() }), env());
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: `Provider '${id}' not found` });
    }
  });

  it.each(['/', '/about', '/share/abc?x=1', '/_next/static/chunk.js', '/_next/data/build/about.json', '/API/providers/openai/completions', '/Api/models', '/aPi/bedrock-models', '/apix/models'])('uses the original Request and ASSETS response for non-API %s', async (path) => {
    const req = request(path, 'GET');
    const assetResponse = new Response('asset', { status: 200 });
    const assets = { ASSETS: { fetch: vi.fn(async () => assetResponse) } };
    expect(await worker.fetch(req, assets)).toBe(assetResponse);
    expect(assets.ASSETS.fetch).toHaveBeenCalledExactlyOnceWith(req);
  });

  it.each(['/API/providers/openai/completions', '/Api/models', '/aPi/bedrock-models'])('keeps uppercase API prefix %s outside Function routing', async (path) => {
    for (const method of ['GET', 'POST', 'OPTIONS']) {
      const assets = env();
      const req = request(path, method);
      const response = await worker.fetch(req, assets);
      expect(response.status).toBe(method === 'GET' ? 404 : 405);
      expect(response.headers.has('access-control-allow-methods')).toBe(false);
      expect(assets.ASSETS.fetch).toHaveBeenCalledExactlyOnceWith(req);
    }
  });

  it.each([
    ['/api/models', 16_385],
    ['/api/providers/openai/completions', 131_073],
  ] as const)('retains declared and streamed body bounds for %s', async (path, bytes) => {
    const upstream = vi.fn(() => { throw new Error('No provider calls permitted'); });
    vi.stubGlobal('fetch', upstream);
    for (const headers of [new Headers({ 'content-length': String(bytes) }), new Headers()]) {
      const response = await worker.fetch(request(path, 'POST', { headers, body: 'x'.repeat(bytes) }), env());
      expect(response.status).toBe(413);
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    }
    expect(upstream).not.toHaveBeenCalled();
  });
});

describe('native Pages streaming boundary', () => {
  it('passes the original Request into the handler even when the provider owns a separate lifetime signal', async () => {
    const req = request('/api/providers/openai/completions', 'GET');
    const observed = vi.spyOn(apiRoutes[2], 'handler');
    try {
      expect((await worker.fetch(req, env())).status).toBe(405);
      expect(observed).toHaveBeenCalledExactlyOnceWith(req);
    } finally { observed.mockRestore(); }
  });
  it('returns incremental UTF-8 chunks before completion and preserves cf and cancellation forwarding', async () => {
    const release = deferred();
    const complete = deferred();
    const controller = new AbortController();
    let seenSignal: AbortSignal | undefined;
    registerProviderService({
      providerId: 'native-incremental-fixture',
      async getModels() { return []; },
      async *generate(_prompt, _model, _key, signal) {
        seenSignal = signal;
        yield { type: 'chunk', content: 'café 🚗' };
        await release.promise;
        yield { type: 'chunk', content: '終わり' };
        complete.resolve();
      },
    });
    const req = request('/api/providers/native-incremental-fixture/completions?unused=1', 'POST', { body: body(), signal: controller.signal });
    Object.defineProperty(req, 'cf', { value: { colo: 'TEST' } });
    const response = await worker.fetch(req, env());
    expect(response.headers.get('content-type')).toBe('text/event-stream; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('no-store, no-transform');
    const reader = response.body!.getReader();
    expect(decode((await reader.read()).value!)).toMatchObject({ type: 'meta', data: { edgeRegion: 'TEST' } });
    expect(decode((await reader.read()).value!)).toEqual({ type: 'chunk', content: 'café 🚗' });
    expect(seenSignal).toBeInstanceOf(AbortSignal);
    let finished = false;
    void complete.promise.then(() => { finished = true; });
    await Promise.resolve();
    expect(finished).toBe(false);
    release.resolve();
    expect(decode((await reader.read()).value!)).toEqual({ type: 'chunk', content: '終わり' });
    expect((await reader.read()).done).toBe(true);
  });

  it('preserves credential redaction for yielded and thrown stream errors', async () => {
    registerProviderService({
      providerId: 'native-error-fixture',
      async getModels() { return []; },
      async *generate() {
        yield { type: 'error', message: 'Rejected synthetic%2F%2Bkey' };
        throw new Error('Rejected synthetic/+key');
      },
    });
    const response = await worker.fetch(request('/api/providers/native-error-fixture/completions', 'POST', { body: body('synthetic/+key') }), env());
    const events = (await response.text()).split('\n\n').filter(Boolean).map(x => JSON.parse(x.slice(6)));
    expect(events.slice(1)).toEqual([{ type: 'error', message: 'Rejected [REDACTED]' }, { type: 'error', message: 'Rejected [REDACTED]' }]);
  });

  it('forwards request cancellation to the provider lifetime signal', async () => {
    const started = deferred();
    const stopped = deferred();
    const controller = new AbortController();
    let seenSignal: AbortSignal | undefined;
    registerProviderService({
      providerId: 'native-abort-fixture',
      async getModels() { return []; },
      async *generate(_prompt, _model, _key, signal) {
        seenSignal = signal;
        try {
          started.resolve();
          await new Promise<void>(resolve => signal!.addEventListener('abort', () => resolve(), { once: true }));
          yield { type: 'chunk', content: 'must not be sent after abort' };
        } finally { stopped.resolve(); }
      },
    });
    const req = request('/api/providers/native-abort-fixture/completions', 'POST', { body: body(), signal: controller.signal });
    const response = await worker.fetch(req, env());
    const reader = response.body!.getReader();
    await reader.read();
    await started.promise;
    const next = reader.read().catch(() => ({ done: true, value: undefined }));
    controller.abort();
    await stopped.promise;
    expect(seenSignal).toBeInstanceOf(AbortSignal);
    expect(seenSignal!.aborted).toBe(true);
    expect((await next).value).toBeUndefined();
  });
});
