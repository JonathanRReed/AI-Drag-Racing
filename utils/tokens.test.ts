import { describe, it, expect } from 'vitest';
import { approxTokensFromText, finalTokenTotal } from './tokens';

describe('approxTokensFromText', () => {
  it('returns 0 for empty string', () => {
    expect(approxTokensFromText('')).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(approxTokensFromText(undefined)).toBe(0);
  });

  it('returns 0 for null', () => {
    expect(approxTokensFromText(null)).toBe(0);
  });

  it('returns correctly calculated tokens for short strings', () => {
    // Math.ceil(4 / 4) = 1
    expect(approxTokensFromText('abcd')).toBe(1);

    // Math.ceil(5 / 4) = 2
    expect(approxTokensFromText('abcde')).toBe(2);

    // Math.ceil(8 / 4) = 2
    expect(approxTokensFromText('abcdefgh')).toBe(2);
  });

  it('handles strings with spaces', () => {
    // "hello world" -> 11 chars -> Math.ceil(11 / 4) = 3
    expect(approxTokensFromText('hello world')).toBe(3);
  });

  it('handles strings with special characters', () => {
    // "hello\nworld" -> 11 chars -> Math.ceil(11 / 4) = 3
    expect(approxTokensFromText('hello\nworld')).toBe(3);
  });
});

describe('finalTokenTotal', () => {
  it('returns usageTotal if provided and > 0', () => {
    expect(finalTokenTotal({ usageTotal: 10, usageIn: 5, usageOut: 5 })).toBe(10);
    expect(finalTokenTotal({ usageTotal: 15 })).toBe(15);
  });

  it('returns sum of usageIn and usageOut if usageTotal is missing or 0', () => {
    expect(finalTokenTotal({ usageIn: 5, usageOut: 7 })).toBe(12);
    expect(finalTokenTotal({ usageTotal: 0, usageIn: 5, usageOut: 7 })).toBe(12);
  });

  it('handles missing usageIn or usageOut', () => {
    expect(finalTokenTotal({ usageIn: 5 })).toBe(5);
    expect(finalTokenTotal({ usageOut: 7 })).toBe(7);
  });

  it('falls back to approxTokensFromText if no usage provided', () => {
    // approxTokensFromText('hello') = 2
    // approxTokensFromText('world') = 2
    expect(finalTokenTotal({ prompt: 'hello', generated: 'world' })).toBe(4);
  });

  it('handles missing prompt or generated', () => {
    expect(finalTokenTotal({ prompt: 'hello' })).toBe(2);
    expect(finalTokenTotal({ generated: 'world' })).toBe(2);
    expect(finalTokenTotal({})).toBe(0);
  });
});
