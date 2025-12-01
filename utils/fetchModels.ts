// Utility to fetch available model names for each provider
// Centralized approach: use provider config
import { getProviderById } from './providers';

export async function fetchModels(providerId: string, apiKey: string, endpoint?: string): Promise<string[]> {
  const provider = getProviderById(providerId);
  if (!provider || !provider.fetcher) return [];
  try {
    // Pass endpoint for Azure
    if (providerId === 'azure') {
      return await provider.fetcher(apiKey, endpoint);
    }
    return await provider.fetcher(apiKey);
  } catch (e) {
    // Ignore error, return empty
  }
  return [];
}

// Export provider-specific fetchers for provider config
export async function fetchOpenAIModels(apiKey: string): Promise<string[]> {
  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  if (!res.ok) throw new Error('OpenAI model fetch failed');
  const data = await res.json();
  return data.data
    .map((m: any) => m.id)
    .filter((id: string) => id.startsWith('gpt-'));
}

export async function fetchGroqModels(apiKey: string): Promise<string[]> {
  const res = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  if (!res.ok) throw new Error('Groq model fetch failed');
  const data = await res.json();
  return data.data.map((m: any) => m.id);
}

export async function fetchAnthropicModels(apiKey: string): Promise<string[]> {
  // Try official List Models endpoint; fallback to static list
  try {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    });
    if (!res.ok) throw new Error(`Anthropic models error: ${res.status}`);
    const data = await res.json();
    if (Array.isArray((data as any)?.data)) {
      return (data as any).data.map((m: any) => m.id).filter(Boolean);
    }
  } catch (e) {
    console.warn('[Anthropic] fetchAnthropicModels fallback to static:', e);
  }
  return [
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
  ];
}

export async function fetchGoogleModels(apiKey: string): Promise<string[]> {
  // Docs: https://ai.google.dev/api/models#v1beta.models.list
  // API key can be provided via query parameter `key`.
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) throw new Error('Gemini model fetch failed');
  const data = await res.json();
  if (!Array.isArray(data.models)) return [];
  // Normalize names by stripping the leading 'models/' to match provider service expectations
  return data.models
    .map((m: any) => (m.name || '').replace(/^models\//, ''))
    .filter(Boolean);
}

export async function fetchAzureModels(apiKey: string, endpoint?: string): Promise<string[]> {
  // Azure OpenAI does not have a public endpoint for listing models.
  // You must know the deployment name (model name) configured in your Azure portal.
  // See https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/create-resource for details.
  // Optionally, you could allow manual entry.
  return [];
}

export async function fetchOpenRouterModels(apiKey: string): Promise<string[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  if (!res.ok) throw new Error('OpenRouter model fetch failed');
  const data = await res.json();
  return data.data.map((m: any) => m.id);
}

// Cohere model listing
export async function fetchCohereModels(apiKey: string): Promise<string[]> {
  const res = await fetch('https://api.cohere.com/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  if (!res.ok) throw new Error('Cohere model fetch failed');
  const data = await res.json();
  const arr = Array.isArray(data?.models) ? data.models : Array.isArray(data?.data) ? data.data : [];
  return arr.map((m: any) => m.name || m.id).filter(Boolean);
}

// Mistral model listing
export async function fetchMistralModels(apiKey: string): Promise<string[]> {
  const res = await fetch('https://api.mistral.ai/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  if (!res.ok) throw new Error('Mistral model fetch failed');
  const data = await res.json();
  return Array.isArray(data?.data) ? data.data.map((m: any) => m.id).filter(Boolean) : [];
}

// Bedrock model listing via server API (requires AWS creds server-side)
export async function fetchBedrockModels(apiKey: string): Promise<string[]> {
  const res = await fetch('/api/bedrock-models', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  });
  if (!res.ok) throw new Error('Bedrock model fetch failed');
  const data = await res.json();
  if (Array.isArray(data?.models)) return data.models as string[];
  // fallback shape compatibility
  if (Array.isArray(data?.data)) return data.data.map((m: any) => m.modelId || m.id).filter(Boolean);
  return [];
}

// --- BEGIN PATCH: Add Fireworks Model Fetcher ---
export async function fetchFireworksModels(apiKey: string): Promise<string[]> {
  const res = await fetch('https://api.fireworks.ai/inference/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  if (!res.ok) throw new Error('Fireworks model fetch failed');
  const data = await res.json();
  // Fireworks returns { data: [{ id: ... }, ...] }
  return data.data.map((m: any) => m.id);
}
// --- END PATCH ---

// --- BEGIN PATCH: Together AI Types and Inference ---
// TogetherModel: Structure of a model from Together AI
export interface TogetherModel {
  id: string;
  object: string;
  owned_by?: string;
  permission?: any[];
  // Add more fields as needed
}

// Fetch models from Together AI with typing and error handling
export async function fetchTogetherModels(apiKey: string): Promise<string[]> {
  console.log('[TogetherAI] fetchTogetherModels called with apiKey:', apiKey ? '[REDACTED]' : '[EMPTY]');
  try {
    const res = await fetch('https://api.together.xyz/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    console.log('[TogetherAI] Response status:', res.status);
    if (!res.ok) {
      const errorText = await res.text();
      console.error('[TogetherAI] Model fetch failed:', errorText);
      throw new Error('Together AI model fetch failed: ' + errorText);
    }
    const data = await res.json();
    console.log('[TogetherAI] Raw model response:', data);
    if (Array.isArray(data)) {
      return data.map((m: TogetherModel) => m.id);
    }
    if (Array.isArray((data as any)?.data)) {
      return (data as any).data.map((m: TogetherModel) => m.id);
    }
    throw new Error('Malformed Together AI model response');
  } catch (err) {
    console.error('[TogetherAI] fetchTogetherModels error:', err);
    throw err;
  }
}

// Perform inference using Together AI /chat/completions endpoint
export async function performTogetherInference({
  apiKey,
  model,
  messages
}: {
  apiKey: string;
  model: string;
  messages: { role: string; content: string }[];
}): Promise<string> {
  // Heuristic: treat models as chat if name contains 'chat', 'instruct', or 'mistral-large', else completion
  const isChatModel = /chat|instruct|mistral-large|llama-3-70b|llama-3-8b|llama-2-70b-chat|llama-2-13b-chat|llama-2-7b-chat/i.test(model);
  let url, payload;
  if (isChatModel) {
    url = 'https://api.together.xyz/v1/chat/completions';
    payload = { model, messages };
  } else {
    url = 'https://api.together.xyz/v1/completions';
    payload = { model, prompt: messages[0]?.content || '' };
  }
  console.log('[TogetherAI] Inference endpoint:', url);
  console.log('[TogetherAI] Inference payload:', payload);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Together AI inference failed');
  const data = await res.json();
  // Response extraction
  if (isChatModel) {
    if (!data.choices || !data.choices[0]?.message?.content) throw new Error('Malformed Together AI chat response');
    return data.choices[0].message.content;
  } else {
    if (!data.choices || !data.choices[0]?.text) throw new Error('Malformed Together AI completion response');
    return data.choices[0].text;
  }
}

// --- Additional provider model fetcher stubs ---
// TODO: Replace these with real list-models calls once APIs are integrated.
export async function fetchPerplexityModels(_apiKey: string): Promise<string[]> {
  return [];
}

export async function fetchXaiModels(_apiKey: string): Promise<string[]> {
  return [];
}

export async function fetchDeepSeekModels(_apiKey: string): Promise<string[]> {
  return [];
}

export async function fetchAI21Models(_apiKey: string): Promise<string[]> {
  return [];
}

// Cerebras model listing - static list since they have fixed models
export async function fetchCerebrasModels(_apiKey: string): Promise<string[]> {
  // Cerebras has a fixed set of models
  return [
    'llama3.1-8b',
    'llama-3.3-70b',
    'qwen-3-32b',
    'gpt-oss-120b',
  ];
}
// --- END PATCH ---
