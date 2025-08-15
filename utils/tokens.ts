// utils/tokens.ts

export function approxTokensFromText(text: string | undefined | null): number {
  const s = text || '';
  return Math.ceil(s.length / 4);
}

export function finalTokenTotal(args: {
  usageTotal?: number;
  usageIn?: number;
  usageOut?: number;
  prompt?: string;
  generated?: string;
}): number {
  const { usageTotal, usageIn, usageOut, prompt, generated } = args;
  if (usageTotal && usageTotal > 0) return usageTotal;
  const sum = (usageIn || 0) + (usageOut || 0);
  if (sum > 0) return sum;
  return approxTokensFromText(prompt) + approxTokensFromText(generated);
}
