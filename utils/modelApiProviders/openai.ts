import { ProviderParams, ProviderResult } from './types';
import { OPENAI_PRICING } from '../modelApiPricing';

export async function handleOpenAI({
  apiKey, model, prompt
}: ProviderParams): Promise<ProviderResult> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
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
  const pricing = OPENAI_PRICING[model] || { input: 0.0, output: 0.0 };
  const inputTokens = data.usage?.prompt_tokens ?? 0;
  const outputTokens = data.usage?.completion_tokens ?? 0;
  const cost = ((inputTokens / 1000) * pricing.input) + ((outputTokens / 1000) * pricing.output);
  return { output, usage, totalTokens, cost };
}
