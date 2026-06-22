import { ProviderParams, ProviderResult } from './types';

export async function handleGoogle({
  apiKey, model, prompt
}: ProviderParams): Promise<ProviderResult> {
  const res = await fetch('/api/google-gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, model, prompt })
  });
  if (!res.ok) {
    return { output: null, error: `HTTP ${res.status}: ${await res.text()}` };
  }
  const data = await res.json();
  const output = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return { output };
}
