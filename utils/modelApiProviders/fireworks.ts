import { ProviderParams, ProviderResult } from './types';

export async function handleFireworks({
  apiKey, model, prompt
}: ProviderParams): Promise<ProviderResult> {
  const isChatModel = /chat/i.test(model);
  const url = isChatModel
    ? 'https://api.fireworks.ai/inference/v1/chat/completions'
    : 'https://api.fireworks.ai/inference/v1/completions';
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  const body = isChatModel ? {
    model,
    max_tokens: 1024,
    top_p: 1,
    top_k: 40,
    presence_penalty: 0,
    frequency_penalty: 0,
    temperature: 0.6,
    messages: [{ role: 'user', content: prompt }]
  } : {
    model,
    max_tokens: 1024,
    top_p: 1,
    top_k: 40,
    presence_penalty: 0,
    frequency_penalty: 0,
    temperature: 0.6,
    prompt
  };
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    return { output: null, error: `HTTP ${res.status}: ${await res.text()}` };
  }
  const data = await res.json();
  let output = '';
  if (data.choices?.[0]?.message?.content !== undefined) {
    output = data.choices[0].message.content;
  } else if (data.choices?.[0]?.text !== undefined) {
    output = data.choices[0].text;
  }
  return { output };
}
