import { ProviderParams, ProviderResult } from './types';
import { OPENAI_PRICING } from '../modelApiPricing';

export async function handleAzure({
  apiKey, endpoint, model, prompt
}: ProviderParams): Promise<ProviderResult> {
  const res = await fetch('/api/azure-openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, endpoint, model, prompt })
  });
  if (!res.ok) {
    return { output: null, error: `HTTP ${res.status}: ${await res.text()}` };
  }
  const data = await res.json();
  const output = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';
  const usage = data.usage || null;
  const totalTokens = data.usage?.total_tokens ?? null;
  const pricing = OPENAI_PRICING[model] || { input: 0.0, output: 0.0 };
  const inputTokens = data.usage?.prompt_tokens ?? 0;
  const outputTokens = data.usage?.completion_tokens ?? 0;
  const cost = ((inputTokens / 1000) * pricing.input) + ((outputTokens / 1000) * pricing.output);
  return { output, usage, totalTokens, cost };
}
