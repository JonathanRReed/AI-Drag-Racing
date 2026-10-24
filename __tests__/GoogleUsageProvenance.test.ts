import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../pages/api/providers/[providerId]/completions';
import { parseSseJson } from '../utils/sse';
import type { CompletionResult } from '../utils/providerService';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

// Exercise the actual adapter, route and SSE parser; the only replacement is
// external HTTP. No credential or provider is used.
async function generate(usageEvents: unknown[]) {
  const body = usageEvents.map((usageMetadata, index) => `data: ${JSON.stringify({
    ...(index === 0 ? { candidates: [{ content: { parts: [{ text: 'abcdefgh' }] } }] } : {}), usageMetadata,
  })}\n\n`).join('');
  vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { headers: { 'Content-Type': 'text/event-stream' } })));
  const response = await handler(new Request('https://synthetic.invalid/api/providers/google/completions', {
    method: 'POST', body: JSON.stringify({ prompt: 'fixture prompt', model: 'fixture-model', apiKey: 'synthetic-test-value' }),
  }));
  const events: CompletionResult[] = [];
  for await (const event of parseSseJson<CompletionResult>(response, 'synthetic')) events.push(event);
  const metrics = events.find(event => event.type === 'metrics');
  expect(metrics?.type).toBe('metrics');
  if (metrics?.type !== 'metrics') throw new Error('Missing synthetic metrics');
  return metrics.data;
}

describe('Google usage provenance through the completion route', () => {
  it.each([
    [{ promptTokenCount: 11, candidatesTokenCount: 7, totalTokenCount: 18 }, { inputTokens: 11, outputTokens: 7, tokenCount: 18, tokenCountSource: 'provider-reported' }],
    [{ promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 }, { inputTokens: 0, outputTokens: 0, tokenCount: 0, tokenCountSource: 'provider-reported' }],
    [{ promptTokenCount: 11, candidatesTokenCount: 7, totalTokenCount: 23 }, { inputTokens: 11, outputTokens: 7, tokenCount: 23, tokenCountSource: 'provider-reported' }],
    [undefined, { inputTokens: 4, outputTokens: 2, tokenCount: 6, tokenCountSource: 'estimated' }],
    [{ promptTokenCount: 11 }, { inputTokens: 11, outputTokens: 2, tokenCount: 13, tokenCountSource: 'estimated' }],
    [{ candidatesTokenCount: 0 }, { inputTokens: 4, outputTokens: 0, tokenCount: 4, tokenCountSource: 'estimated' }],
    [{ promptTokenCount: 0, totalTokenCount: 0 }, { inputTokens: 0, outputTokens: 2, tokenCount: 0, tokenCountSource: 'estimated' }],
    [{ promptTokenCount: 11, candidatesTokenCount: 7 }, { inputTokens: 11, outputTokens: 7, tokenCount: 18, tokenCountSource: 'estimated' }],
    [{ totalTokenCount: 23 }, { inputTokens: 4, outputTokens: 2, tokenCount: 23, tokenCountSource: 'estimated' }],
  ])('preserves valid values and distinguishes a complete report from fallback: %j', async (usage, expected) => {
    expect(await generate([usage])).toMatchObject({ ...expected, timingSource: 'edge-measured' });
  });

  it.each(['7', -1, 1.5, null, true, {}, [], Number.MAX_SAFE_INTEGER + 1, Infinity, NaN])('rejects invalid usage %j without losing other valid reported fields', async invalid => {
    expect(await generate([{ promptTokenCount: 11, candidatesTokenCount: invalid, totalTokenCount: 23 }])).toMatchObject({ inputTokens: 11, outputTokens: 2, tokenCount: 23, tokenCountSource: 'estimated' });
  });

  it.each(['promptTokenCount', 'candidatesTokenCount', 'totalTokenCount'])('validates %s independently', async field => {
    const metrics = await generate([{ promptTokenCount: 11, candidatesTokenCount: 7, totalTokenCount: 23, [field]: 'invalid' }]);
    expect(metrics).toMatchObject({ inputTokens: field === 'promptTokenCount' ? 4 : 11, outputTokens: field === 'candidatesTokenCount' ? 2 : 7, tokenCount: field === 'totalTokenCount' ? 18 : 23, tokenCountSource: 'estimated' });
  });

  it('retains valid partial reports across missing fields and accepts the safe integer boundary', async () => {
    expect(await generate([{ promptTokenCount: Number.MAX_SAFE_INTEGER }, { candidatesTokenCount: 0 }, { totalTokenCount: Number.MAX_SAFE_INTEGER }])).toMatchObject({ inputTokens: Number.MAX_SAFE_INTEGER, outputTokens: 0, tokenCount: Number.MAX_SAFE_INTEGER, tokenCountSource: 'provider-reported' });
  });

  it('does not promote an earlier value after a later present but invalid report', async () => {
    expect(await generate([{ promptTokenCount: 11, candidatesTokenCount: 7, totalTokenCount: 23 }, { candidatesTokenCount: 'invalid' }])).toMatchObject({ inputTokens: 11, outputTokens: 2, tokenCount: 23, tokenCountSource: 'estimated' });
  });
});
