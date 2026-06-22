import { ProviderParams, ProviderResult } from './types';

function estimateAnthropicCost(model: string, usage: any): number | null {
  if (!usage?.input_tokens || !usage?.output_tokens) return null;
  return (usage.input_tokens / 1000) * 0.008 + (usage.output_tokens / 1000) * 0.024;
}

export async function handleAnthropic({
  apiKey, model, prompt
}: ProviderParams): Promise<ProviderResult> {
  const res = await fetch('/api/anthropic-completion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, model, prompt, max_tokens: 1024 })
  });
  if (!res.ok) {
    return { output: null, error: `HTTP ${res.status}: ${await res.text()}` };
  }
  const data = await res.json();
  const output = data.completion || '';
  const usage = data.usage || null;
  const cost = usage ? estimateAnthropicCost(model, usage) : null;
  const totalTokens = usage?.input_tokens && usage?.output_tokens ? usage.input_tokens + usage.output_tokens : null;
  return { output, usage, totalTokens, cost };
}
