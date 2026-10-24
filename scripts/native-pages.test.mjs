import { readFileSync, mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { bundleWorker, writeStaticPolicies, verifyStaticExport } from './build-pages.mjs';
import audit from './dependency-audit.cjs';

const root = process.cwd();
const temporary = mkdtempSync(path.join(tmpdir(), 'racing-native-tests-'));
afterAll(() => { rmSync(temporary, { recursive: true, force: true }); vi.unstubAllGlobals(); });

describe('native Pages artifact', () => {
  let built;
  let worker;
  beforeAll(async () => {
    process.env.NATIVE_BUILD_SECRET_CANARY = 'synthetic-only-do-not-inline-this-value';
    try { built = await bundleWorker(root, path.join(temporary, '_worker.js')); }
    finally { delete process.env.NATIVE_BUILD_SECRET_CANARY; }
    worker = await import(`data:text/javascript;base64,${Buffer.from(readFileSync(path.join(temporary, '_worker.js'))).toString('base64')}`);
  });
  it('bundles only application inputs with no external imports, Node/Next runtime, secrets or source maps', () => {
    const inputs = Object.keys(built.metafile.inputs);
    expect(audit.validateNativeInputs(inputs).inputCount).toBeGreaterThan(3);
    expect(Object.values(built.metafile.outputs).flatMap(x => x.imports)).toEqual([]);
    const code = readFileSync(path.join(temporary, '_worker.js'), 'utf8');
    expect(code).not.toMatch(/sourceMappingURL|\brequire\s*\(|\bprocess\s*\.|node:|synthetic-only-do-not-inline-this-value/);
    expect(existsSync(path.join(temporary, '_worker.js.map'))).toBe(false);
  });
  it('exposes exactly the same reviewed handler paths in the actual bundle', () => {
    expect(worker.apiRoutes.map(route => route.path).sort()).toEqual(['/api/bedrock-models', '/api/models', '/api/providers/[providerId]/completions']);
  });
  it('executes the built worker through native Fetch with only a bounded upstream fixture', async () => {
    const bytes = new TextEncoder().encode('data: {"choices":[{"delta":{"content":"café 🚗"}}]}\n\ndata: [DONE]\n\n');
    const body = new ReadableStream({ start(controller) {
      // Deliberately split inside the emoji UTF-8 encoding.
      const split = bytes.indexOf(0xf0) + 2;
      controller.enqueue(bytes.slice(0, split));
      controller.enqueue(bytes.slice(split));
      controller.close();
    } });
    const upstream = vi.fn(async () => new Response(body));
    vi.stubGlobal('fetch', upstream);
    const req = new Request('https://app.example/api/providers/openai/completions', { method: 'POST', body: JSON.stringify({ prompt: 'fixture', model: 'fixture-model', apiKey: 'synthetic-test-key' }) });
    Object.defineProperty(req, 'cf', { value: { colo: 'FIXTURE' } });
    const assets = { ASSETS: { fetch: vi.fn(async () => new Response('asset')) } };
    const response = await worker.default.fetch(req, assets);
    const events = (await response.text()).split('\n\n').filter(Boolean).map(x => JSON.parse(x.slice(6)));
    expect(events[0]).toMatchObject({ type: 'meta', data: { edgeRegion: 'FIXTURE' } });
    expect(events).toContainEqual({ type: 'chunk', content: 'café 🚗' });
    expect(upstream).toHaveBeenCalledTimes(1);
    expect(upstream.mock.calls[0][0]).toBe('https://api.openai.com/v1/chat/completions');
    expect(assets.ASSETS.fetch).not.toHaveBeenCalled();
  });
  it('retains static headers, share rewrite and immutable chunk caching with only API Function invocation', () => {
    const out = path.join(temporary, 'static'); mkdirSync(out);
    writeStaticPolicies(root, out);
    expect(JSON.parse(readFileSync(path.join(out, '_routes.json')))).toEqual({ version: 1, include: ['/api/*'], exclude: [] });
    expect(readFileSync(path.join(out, '_redirects'), 'utf8')).toBe(readFileSync(path.join(root, 'public/_redirects'), 'utf8'));
    const headers = readFileSync(path.join(out, '_headers'), 'utf8');
    expect(headers).toContain(readFileSync(path.join(root, 'public/_headers'), 'utf8'));
    expect(headers).toContain('/_next/static/*\n  Cache-Control: public,max-age=31536000,immutable');
  });
  it('fails closed for missing share shell or non-static API export', () => {
    expect(() => verifyStaticExport(temporary)).toThrow();
    const out = path.join(temporary, 'bad-export'); mkdirSync(out);
    for (const file of ['index.html', '404.html', 'about.html', 'contact.html', 'methodology.html', 'privacy.html', 'subprocessors.html']) writeFileSync(path.join(out, file), 'fixture');
    mkdirSync(path.join(out, 'share'));
    writeFileSync(path.join(out, 'share/[id].html'), '<script id="__NEXT_DATA__" type="application/json">{"page":"/share/[id]","query":{},"nextExport":true,"autoExport":true}</script>');
    expect(() => verifyStaticExport(out)).not.toThrow();
    mkdirSync(path.join(out, 'api'));
    expect(() => verifyStaticExport(out)).toThrow(/API/);
  });
});
