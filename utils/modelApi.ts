import { modelApiProviders } from './modelApiProviders';

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

export async function callModelApi({
  provider, apiKey, model, prompt, endpoint
}: ModelApiParams): Promise<ModelApiResult> {
  const start = Date.now();

  // Normalize provider id for comparison
  const providerId: string = provider.toLowerCase();

  try {
    const handler = modelApiProviders[providerId];
    if (!handler) {
      return { output: null, latency: null, usage: null, cost: null, totalTokens: null, error: 'Provider not supported yet.' };
    }

    const result = await handler({ apiKey, model, prompt, endpoint });

    const latency = Date.now() - start;
    return {
      output: result.output,
      latency,
      usage: result.usage || null,
      cost: result.cost ?? null,
      totalTokens: result.totalTokens ?? null,
      error: result.error
    };
  } catch (err: any) {
    // Enhanced error logging for debugging
    console.error('Model API error:', err);
    if (typeof window !== 'undefined') {
      alert('Model API error: ' + (err?.message || JSON.stringify(err)));
    }
    return { output: null, latency: null, error: err?.message || 'Unknown error' };
  }
}

