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
