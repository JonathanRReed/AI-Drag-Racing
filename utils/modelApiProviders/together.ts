import { ProviderParams, ProviderResult } from './types';

function estimateTogetherCost(model: string, usage: any): number | null {
  if (!usage?.total_tokens) return null;
  return (usage.total_tokens / 1000) * 0.002;
}

export async function handleTogether({
  apiKey, model, prompt
}: ProviderParams): Promise<ProviderResult> {
  const res = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024
    })
  });
  if (!res.ok) {
    return { output: null, error: `HTTP ${res.status}: ${await res.text()}` };
  }
  const data = await res.json();
  const output = data.choices?.[0]?.message?.content ?? '';
  const usage = data.usage || null;
  const cost = usage ? estimateTogetherCost(model, usage) : null;
  const totalTokens = usage?.total_tokens ?? null;
  return { output, usage, totalTokens, cost };
}
