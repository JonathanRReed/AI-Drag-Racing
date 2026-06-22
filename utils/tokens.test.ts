import { describe, it, expect } from 'vitest';
import { finalTokenTotal, approxTokensFromText } from './tokens';

describe('approxTokensFromText', () => {
  it('should return 0 for empty string, null or undefined', () => {
    expect(approxTokensFromText('')).toBe(0);
    expect(approxTokensFromText(undefined)).toBe(0);
    expect(approxTokensFromText(null)).toBe(0);
  });

  it('should calculate approximately 1 token per 4 characters', () => {
    expect(approxTokensFromText('1234')).toBe(1);
    expect(approxTokensFromText('12345')).toBe(2);
    expect(approxTokensFromText('12345678')).toBe(2);
  });
});

describe('finalTokenTotal', () => {
  it('should return usageTotal if provided and > 0', () => {
    expect(finalTokenTotal({ usageTotal: 10, usageIn: 5, usageOut: 5 })).toBe(10);
    expect(finalTokenTotal({ usageTotal: 10, prompt: 'abc', generated: 'def' })).toBe(10);
  });

  it('should return sum of usageIn and usageOut if usageTotal is missing or 0', () => {
    expect(finalTokenTotal({ usageTotal: 0, usageIn: 5, usageOut: 6 })).toBe(11);
    expect(finalTokenTotal({ usageIn: 5, usageOut: 6 })).toBe(11);
    expect(finalTokenTotal({ usageIn: 5 })).toBe(5);
    expect(finalTokenTotal({ usageOut: 6 })).toBe(6);
  });

  it('should return approxTokensFromText sum if usage metrics are missing or 0', () => {
    expect(finalTokenTotal({ prompt: '1234', generated: '12345' })).toBe(3); // 1 + 2
    expect(finalTokenTotal({ usageTotal: 0, usageIn: 0, usageOut: 0, prompt: '1234', generated: '12345' })).toBe(3);
    expect(finalTokenTotal({ prompt: '1234' })).toBe(1);
    expect(finalTokenTotal({ generated: '12345' })).toBe(2);
  });
});
