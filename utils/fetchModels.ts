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
// Helper to call our own proxy
async function fetchViaProxy(providerId: string, apiKey: string): Promise<string[]> {
  try {
    const res = await fetch('/api/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId, apiKey: apiKey.trim() }),
    });
    if (!res.ok) throw new Error('Proxy error');
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data || [];
  } catch (e) {
    console.error(`Fetch failed for ${providerId}:`, e);
    // Return empty to let specific fallbacks handle it if needed
    throw e;
  }
}

// Comprehensive OpenAI fallback including reasoning models and GPT-5
const OPENAI_FALLBACK = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-4',
  'gpt-3.5-turbo',
  'o1',
  'o1-mini',
  'o1-preview',
  'o3',
  'o3-mini',
  'o3-high',
  'gpt-5-preview',
  'gpt-5',
];

export async function fetchOpenAIModels(apiKey: string): Promise<string[]> {
  try {
    const models = await fetchViaProxy('openai', apiKey);
    // Filter to chat/reasoning models and merge with fallback
    const filtered = models.filter(id =>
      id.startsWith('gpt-') ||
      id.startsWith('o1') ||
      id.startsWith('o3') ||
      id.includes('reasoning') ||
      id.includes('thinking')
    );
    const merged = new Set([...filtered, ...OPENAI_FALLBACK]);
    return Array.from(merged);
  } catch (e) {
    return OPENAI_FALLBACK;
  }
}

export async function fetchGroqModels(apiKey: string): Promise<string[]> {
  try {
    return await fetchViaProxy('groq', apiKey);
  } catch (e) {
    console.warn('[Groq] fetchGroqModels failed, using static fallback:', e);
    // Exhaustive fallback (Dec 2025)
    return [
      // Llama 3/3.1/3.3 Series
      'llama-3.3-70b-versatile',
      'llama-3.1-70b-versatile',
      'llama-3.1-8b-instant',
      'llama3-70b-8192',
      'llama3-8b-8192',
      'llama-guard-3-8b',
      'meta-llama/llama-guard-4-12b',

      // Llama 4 Preview (Groq exclusive)
      'groq/meta-llama/llama-4-maverick-17b-128e-instruct',
      'groq/meta-llama/llama-4-scout-17b-16e-instruct',

      // Mistral / Mixtral
      'mistral-saba-24b',
      'mixtral-8x7b-32768',

      // Gemma
      'gemma2-9b-it',

      // OpenAI on Groq
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'whisper-large-v3',
      'whisper-large-v3-turbo',

      // Qwen on Groq
      'qwen-qwq-32b',
      'qwen/qwen3-32b',

      // Moonshot on Groq
      'moonshotai/kimi-k2-instruct',
      'moonshotai/kimi-k2-instruct-0905'
    ];
  }
}

export async function fetchAnthropicModels(apiKey: string): Promise<string[]> {
  try {
    return await fetchViaProxy('anthropic', apiKey);
  } catch (e) {
    // Extensive fallback for Anthropic (Dec 2025)
    return [
      // 4.5 Series (Late 2025)
      'claude-opus-4-5-20251101',
      'claude-sonnet-4-5-20250929',
      'claude-haiku-4-5-20251001',

      // 4.0 Series (Mid-Late 2025)
      'claude-sonnet-4-20250514',
      'claude-opus-4-20250522',
      'claude-3-7-sonnet-20250224',

      // 3.5 Series
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-5-sonnet-20240620',

      // Legacy
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ];
  }
}

// Google Gemini models
export async function fetchGoogleModels(apiKey: string): Promise<string[]> {
  try {
    return await fetchViaProxy('google', apiKey);
  } catch (e) {
    return [
      'gemini-2.0-flash-exp',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.0-pro',
    ];
  }
}

// Azure OpenAI - requires custom endpoint
export async function fetchAzureModels(_apiKey: string, _endpoint?: string): Promise<string[]> {
  // Azure requires deployment names which are user-configured
  return [];
}

// OpenRouter models
export async function fetchOpenRouterModels(apiKey: string): Promise<string[]> {
  try {
    return await fetchViaProxy('openrouter', apiKey);
  } catch (e) {
    return [
      'openai/gpt-4o',
      'openai/gpt-4-turbo',
      'anthropic/claude-3.5-sonnet',
      'google/gemini-pro-1.5',
      'meta-llama/llama-3.1-70b-instruct',
    ];
  }
}

// Fireworks AI models
export async function fetchFireworksModels(apiKey: string): Promise<string[]> {
  try {
    return await fetchViaProxy('fireworks', apiKey);
  } catch (e) {
    return [
      'accounts/fireworks/models/llama-v3p1-70b-instruct',
      'accounts/fireworks/models/llama-v3p1-8b-instruct',
      'accounts/fireworks/models/mixtral-8x7b-instruct',
    ];
  }
}

// Cohere models
export async function fetchCohereModels(apiKey: string): Promise<string[]> {
  try {
    return await fetchViaProxy('cohere', apiKey);
  } catch (e) {
    return [
      'command-r-plus',
      'command-r',
      'command',
      'command-light',
    ];
  }
}

// Mistral models
export async function fetchMistralModels(apiKey: string): Promise<string[]> {
  try {
    return await fetchViaProxy('mistral', apiKey);
  } catch (e) {
    return [
      'mistral-large-latest',
      'mistral-medium-latest',
      'mistral-small-latest',
      'open-mixtral-8x22b',
      'open-mixtral-8x7b',
    ];
  }
}

// AWS Bedrock models - requires AWS credentials
export async function fetchBedrockModels(_apiKey: string): Promise<string[]> {
  // Bedrock uses AWS SDK and has specific model IDs
  return [
    'anthropic.claude-3-sonnet-20240229-v1:0',
    'anthropic.claude-3-haiku-20240307-v1:0',
    'amazon.titan-text-express-v1',
    'meta.llama3-70b-instruct-v1:0',
  ];
}

// Comprehensive Moonshot/Kimi fallback
const MOONSHOT_FALLBACK = [
  'kimi-k2-0905-preview',
  'kimi-k2-thinking',
  'kimi-k2-turbo-preview',
  'kimi-k2-instruct',
  'kimi-latest',
  'moonshot-v1-8k',
  'moonshot-v1-32k',
  'moonshot-v1-128k',
  'moonshot-v1-auto',
];

export async function fetchMoonshotModels(apiKey: string): Promise<string[]> {
  try {
    const models = await fetchViaProxy('moonshot', apiKey);
    const merged = new Set([...models, ...MOONSHOT_FALLBACK]);
    return Array.from(merged);
  } catch (e) {
    console.warn('[Moonshot] fetchMoonshotModels failed, using fallback:', e);
    return MOONSHOT_FALLBACK;
  }
}

// Comprehensive Zhipu/GLM fallback
const ZHIPU_FALLBACK = [
  'glm-4.6',
  'glm-4.6-thinking',
  'glm-4-plus',
  'glm-4-plus-0828',
  'glm-4',
  'glm-4-0520',
  'glm-4-long',
  'glm-4-air',
  'glm-4-airx',
  'glm-4-flash',
  'glm-4-flashx',
  'glm-4v',
  'glm-4v-plus',
  'codegeex-4',
];

export async function fetchZhipuModels(apiKey: string): Promise<string[]> {
  try {
    const models = await fetchViaProxy('zhipu', apiKey);
    if (models.length === 0) return ZHIPU_FALLBACK;
    const merged = new Set([...models, ...ZHIPU_FALLBACK]);
    return Array.from(merged);
  } catch (e) {
    console.warn('[Zhipu] fetchZhipuModels failed, using fallback:', e);
    return ZHIPU_FALLBACK;
  }
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
