import { describe, expect, it } from 'vitest';
import { boundedNumber, corsHeadersForRequest, isAllowedRequestOrigin, validateRaceRequestBody } from './requestSecurity';

function request(url: string, origin?: string) {
  return new Request(url, { headers: origin ? { origin } : {} });
}

describe('request security', () => {
  it('accepts the production origin and rejects foreign browser origins', () => {
    expect(isAllowedRequestOrigin(request(
      'https://ai-dragrace.jonathanrreed.com/api/models',
      'https://ai-dragrace.jonathanrreed.com',
    ))).toBe(true);
    expect(corsHeadersForRequest(request(
      'https://ai-dragrace.jonathanrreed.com/api/models',
      'https://attacker.example',
    ))).toBeNull();
  });

  it('allows loopback development across ports', () => {
    expect(isAllowedRequestOrigin(request('http://127.0.0.1:3000/api/models', 'http://localhost:62033'))).toBe(true);
  });

  it('bounds body sizes and settings', () => {
    expect(validateRaceRequestBody({ prompt: '', model: 'm', apiKey: 'k' }).ok).toBe(false);
    expect(validateRaceRequestBody({ prompt: 'x'.repeat(100_001), model: 'm', apiKey: 'k' }).ok).toBe(false);
    expect(validateRaceRequestBody({ prompt: 'hello', model: 'm', apiKey: 'k', settings: {} }).ok).toBe(true);
    expect(boundedNumber(10, 0.7, 0, 2)).toBe(2);
    expect(boundedNumber(Number.NaN, 0.7, 0, 2)).toBe(0.7);
  });
});
