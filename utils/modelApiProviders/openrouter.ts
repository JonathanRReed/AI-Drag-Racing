import { ProviderParams, ProviderResult } from './types';

export async function handleOpenRouter({
  apiKey, model, prompt
}: ProviderParams): Promise<ProviderResult> {
  const res = await fetch('/api/openrouter-completion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, model, prompt, max_tokens: 1024 })
  });
  if (!res.ok) {
    return { output: null, error: `HTTP ${res.status}: ${await res.text()}` };
  }
  const data = await res.json();
  const output = data.output || '';
  const usage = data.usage || null;
  const cost = typeof data.cost === 'number' ? data.cost : null;
  const totalTokens = usage?.total_tokens ?? null;
  return { output, usage, totalTokens, cost };
}
