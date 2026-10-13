import { describe, expect, it, vi } from 'vitest';
import handler from '../pages/api/bedrock-models';

describe('pages/api/bedrock-models', () => {
  it('rejects disallowed origins with 403 and includes nosniff header', async () => {
    const req = new Request('https://ai-dragrace.jonathanrreed.com/api/bedrock-models', {
      method: 'POST',
      headers: { Origin: 'https://attacker.example' },
    });
    const res = await handler(req);
    expect(res.status).toBe(403);
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    const body = await res.json();
    expect(body).toEqual({ error: 'Origin not allowed' });
  });

  it('rejects preflight from a disallowed origin without granting CORS', async () => {
    const req = new Request('https://ai-dragrace.jonathanrreed.com/api/bedrock-models', {
      method: 'OPTIONS',
      headers: { Origin: 'https://attacker.example' },
    });
    const res = await handler(req);
    expect(res.status).toBe(403);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(res.headers.get('Vary')).toBe('Origin');
  });

  it('handles OPTIONS preflight requests for allowed origins', async () => {
    const req = new Request('https://ai-dragrace.jonathanrreed.com/api/bedrock-models', {
      method: 'OPTIONS',
      headers: { Origin: 'https://ai-dragrace.jonathanrreed.com' },
    });
    const res = await handler(req);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
    expect(res.headers.get('Vary')).toBe('Origin');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://ai-dragrace.jonathanrreed.com');
  });

  it('rejects non-POST methods for allowed origins with 405 and includes nosniff header', async () => {
    const req = new Request('https://ai-dragrace.jonathanrreed.com/api/bedrock-models', {
      method: 'GET',
      headers: { Origin: 'https://ai-dragrace.jonathanrreed.com' },
    });
    const res = await handler(req);
    expect(res.status).toBe(405);
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    const body = await res.json();
    expect(body).toEqual({ error: 'Method not allowed' });
  });

  it('returns model list for valid POST request from allowed origin with nosniff header', async () => {
    const req = new Request('https://ai-dragrace.jonathanrreed.com/api/bedrock-models', {
      method: 'POST',
      headers: { Origin: 'https://ai-dragrace.jonathanrreed.com' },
    });
    const res = await handler(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://ai-dragrace.jonathanrreed.com');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    const body = await res.json();
    expect(Array.isArray(body.models)).toBe(true);
    expect(body.models.length).toBeGreaterThan(0);
  });

  it('redacts sensitive details from errors in catch block', async () => {
    const req = new Request('https://ai-dragrace.jonathanrreed.com/api/bedrock-models', {
      method: 'POST',
      headers: { Origin: 'https://ai-dragrace.jonathanrreed.com' },
    });
    const originalStringify = JSON.stringify;
    let calls = 0;
    vi.spyOn(JSON, 'stringify').mockImplementation((val, replacer, space) => {
      calls++;
      if (calls === 1) {
        throw new Error('Failed with secret sk-1234567890abcdef1234567890abcdef');
      }
      return originalStringify(val, replacer as any, space);
    });

    try {
      const res = await handler(req);
      expect(res.status).toBe(500);
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      const body = await res.json();
      expect(body.error).toBe('Failed with secret [REDACTED]');
    } finally {
      vi.restoreAllMocks();
    }
  });
});
