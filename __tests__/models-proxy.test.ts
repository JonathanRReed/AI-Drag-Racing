import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import handler from '../pages/api/models';

describe('pages/api/models handler security and fallback tests', () => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    consoleSpy.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects forbidden origin', async () => {
    const req = new Request('https://ai-dragrace.jonathanrreed.com/api/models', {
      method: 'POST',
      headers: { origin: 'https://evil.com' },
    });
    const res = await handler(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Origin not allowed');
  });

  it('handles provider fetch failures gracefully with static fallback without leaking error message details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Sensitive key sk-12345 leaked in provider error')));

    const req = new Request('https://ai-dragrace.jonathanrreed.com/api/models', {
      method: 'POST',
      headers: { origin: 'https://ai-dragrace.jonathanrreed.com' },
      body: JSON.stringify({ providerId: 'openai', apiKey: 'test-key' }),
    });

    const res = await handler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);

    const calledArgs = consoleSpy.mock.calls.flat().join(' ');
    expect(calledArgs).not.toContain('sk-12345');
    expect(calledArgs).not.toContain('Sensitive key');
  });

  it('does not log raw error messages to console when handler catches uncaught errors', async () => {
    const req = new Request('https://ai-dragrace.jonathanrreed.com/api/models', {
      method: 'POST',
      headers: { origin: 'https://ai-dragrace.jonathanrreed.com' },
      body: JSON.stringify({ providerId: 'unknown-provider', apiKey: 'test-key' }),
    });

    const res = await handler(req);
    expect(res.status).toBe(200);

    const calledArgs = consoleSpy.mock.calls.flat().join(' ');
    expect(calledArgs).not.toContain('sk-12345');
  });
});
