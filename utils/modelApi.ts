
export interface ModelApiParams {
  provider: string;
  apiKey: string;
  model: string;
  prompt: string;
  endpoint?: string; // Add endpoint as an optional field
}

export interface ModelApiResult {
  output: string | null;
  latency: number | null;
  error?: string;
  usage?: any;
  cost?: number | null;
  totalTokens?: number | null;
}

// Cost per 1K tokens (USD) for a few common models (can be expanded)
const OPENAI_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4o': { input: 0.005, output: 0.015 },
};
const GROQ_PRICING: Record<string, number> = {
  'llama2-70b-4096': 0.0008,
  'mixtral-8x7b-32768': 0.0008,
  'gemma-7b-it': 0.0002,
  'llama3-70b-8192': 0.0008,
};

export async function callModelApi({
  provider, apiKey, model, prompt, endpoint
}: ModelApiParams): Promise<ModelApiResult> {
  const start = Date.now();
  let output: string | null = null;
  let latency: number | null = null;
  let usage: any = null;
  let cost: number | null = null;
  let totalTokens: number | null = null;
  let error: string | undefined = undefined;

  // Normalize provider id for comparison
  const providerId: string = provider.toLowerCase();

  try {
    switch (providerId) {
      case 'openai': {
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
          error = `HTTP ${res.status}: ${await res.text()}`;
          break;
        }
        const data = await res.json();
        output = data.choices?.[0]?.message?.content ?? '';
        latency = Date.now() - start;
        usage = data.usage || null;
        totalTokens = data.usage?.total_tokens ?? null;
        const pricing = OPENAI_PRICING[model] || { input: 0.0, output: 0.0 };
        const inputTokens = data.usage?.prompt_tokens ?? 0;
        const outputTokens = data.usage?.completion_tokens ?? 0;
        cost = ((inputTokens / 1000) * pricing.input) + ((outputTokens / 1000) * pricing.output);
        break;
      }
      case 'groq': {
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
          error = `HTTP ${res.status}: ${await res.text()}`;
          break;
        }
        const data = await res.json();
        output = data.choices?.[0]?.message?.content ?? '';
        latency = Date.now() - start;
        usage = data.usage || null;
        totalTokens = data.usage?.total_tokens ?? null;
        const pricePer1k = GROQ_PRICING[model] || 0.0008;
        cost = totalTokens ? (pricePer1k * totalTokens / 1000) : null;
        break;
      }
      case 'azure': {
        const res = await fetch('/api/azure-openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey, endpoint, model, prompt })
        });
        if (!res.ok) {
          error = `HTTP ${res.status}: ${await res.text()}`;
          break;
        }
        const data = await res.json();
        output = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';
        latency = Date.now() - start;
        usage = data.usage || null;
        totalTokens = data.usage?.total_tokens ?? null;
        const pricing = OPENAI_PRICING[model] || { input: 0.0, output: 0.0 };
        const inputTokens = data.usage?.prompt_tokens ?? 0;
        const outputTokens = data.usage?.completion_tokens ?? 0;
        cost = ((inputTokens / 1000) * pricing.input) + ((outputTokens / 1000) * pricing.output);
        break;
      }
      case 'fireworks': {
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
          error = `HTTP ${res.status}: ${await res.text()}`;
          break;
        }
        const data = await res.json();
        if (data.choices?.[0]?.message?.content !== undefined) {
          output = data.choices[0].message.content;
        } else if (data.choices?.[0]?.text !== undefined) {
          output = data.choices[0].text;
        } else {
          output = '';
        }
        latency = Date.now() - start;
        // Fireworks API does not return usage/cost info
        break;
      }
      case 'google': {
        const res = await fetch('/api/google-gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey, model, prompt })
        });
        if (!res.ok) {
          error = `HTTP ${res.status}: ${await res.text()}`;
          break;
        }
        const data = await res.json();
        output = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        latency = Date.now() - start;
        // Google Gemini API does not return usage/cost info
        break;
      }
      case 'openrouter': {
        const res = await fetch('/api/openrouter-completion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey, model, prompt, max_tokens: 1024 })
        });
        if (!res.ok) {
          error = `HTTP ${res.status}: ${await res.text()}`;
          break;
        }
        const data = await res.json();
        output = data.output || '';
        latency = Date.now() - start;
        usage = data.usage || null;
        cost = typeof data.cost === 'number' ? data.cost : null;
        totalTokens = usage?.total_tokens ?? null;
        break;
      }
      case 'anthropic': {
        const res = await fetch('/api/anthropic-completion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey, model, prompt, max_tokens: 1024 })
        });
        if (!res.ok) {
          error = `HTTP ${res.status}: ${await res.text()}`;
          break;
        }
        const data = await res.json();
        output = data.completion || '';
        latency = Date.now() - start;
        usage = data.usage || null;
        cost = usage ? estimateAnthropicCost(model, usage) : null;
        totalTokens = usage?.input_tokens && usage?.output_tokens ? usage.input_tokens + usage.output_tokens : null;
        break;
      }
      case 'together': {
        // Use Together AI's OpenAI-compatible endpoint
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
          error = `HTTP ${res.status}: ${await res.text()}`;
          break;
        }
        const data = await res.json();
        output = data.choices?.[0]?.message?.content ?? '';
        latency = Date.now() - start;
        usage = data.usage || null;
        cost = usage ? estimateOpenAICost(model, usage) : null;
        totalTokens = usage?.total_tokens ?? null;
        break;
      }
      default: {
        error = 'Provider not supported yet.';
        break;
      }
    }
    return { output, latency, usage, cost, totalTokens, error };
  } catch (err: any) {
    // Enhanced error logging for debugging
    console.error('Model API error:', err);
    if (typeof window !== 'undefined') {
      alert('Model API error: ' + (err?.message || JSON.stringify(err)));
    }
    return { output: null, latency: null, error: err?.message || 'Unknown error' };
  }
}

// --- Cost estimation helpers ---
function estimateOpenAICost(model: string, usage: any): number | null {
  // Fill in per-model pricing as needed
  // Example: $0.002 / 1K tokens
  if (!usage?.total_tokens) return null;
  return (usage.total_tokens / 1000) * 0.002;
}
function estimateAnthropicCost(model: string, usage: any): number | null {
  // Fill in per-model pricing as needed
  // Example: $0.008 / 1K input, $0.024 / 1K output
  if (!usage?.input_tokens || !usage?.output_tokens) return null;
  return (usage.input_tokens / 1000) * 0.008 + (usage.output_tokens / 1000) * 0.024;
}
function estimateGroqCost(model: string, usage: any): number | null {
  // Fill in per-model pricing as needed
  if (!usage?.total_tokens) return null;
  return (usage.total_tokens / 1000) * 0.002;
}
