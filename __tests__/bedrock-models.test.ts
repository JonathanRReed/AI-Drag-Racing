import { describe, expect, it } from 'vitest';
import handler from '../pages/api/bedrock-models';

describe('pages/api/bedrock-models', () => {
  it('rejects disallowed origins with 403', async () => {
    const req = new Request('https://ai-dragrace.jonathanrreed.com/api/bedrock-models', {
      method: 'POST',
      headers: { Origin: 'https://attacker.example' },
    });
    const res = await handler(req);
    expect(res.status).toBe(403);
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

  it('rejects non-POST methods for allowed origins with 405', async () => {
    const req = new Request('https://ai-dragrace.jonathanrreed.com/api/bedrock-models', {
      method: 'GET',
      headers: { Origin: 'https://ai-dragrace.jonathanrreed.com' },
    });
    const res = await handler(req);
    expect(res.status).toBe(405);
    const body = await res.json();
    expect(body).toEqual({ error: 'Method not allowed' });
  });

  it('returns model list for valid POST request from allowed origin', async () => {
    const req = new Request('https://ai-dragrace.jonathanrreed.com/api/bedrock-models', {
      method: 'POST',
      headers: { Origin: 'https://ai-dragrace.jonathanrreed.com' },
    });
    const res = await handler(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://ai-dragrace.jonathanrreed.com');
    const body = await res.json();
    expect(Array.isArray(body.models)).toBe(true);
    expect(body.models.length).toBeGreaterThan(0);
  });
});
