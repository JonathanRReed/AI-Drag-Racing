import { ProviderParams, ProviderResult } from './types';
import { GROQ_PRICING } from '../modelApiPricing';

export async function handleGroq({
  apiKey, model, prompt
}: ProviderParams): Promise<ProviderResult> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
  const totalTokens = data.usage?.total_tokens ?? null;
  const pricePer1k = GROQ_PRICING[model] || 0.0008;
  const cost = totalTokens ? (pricePer1k * totalTokens / 1000) : null;
  return { output, usage, totalTokens, cost };
}
