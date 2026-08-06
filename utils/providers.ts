// Centralized provider config for model fetching and display
// Add new providers here for easy extensibility

import { fetchOpenAIModels, fetchGroqModels, fetchAnthropicModels, fetchGoogleModels, fetchAzureModels, fetchOpenRouterModels, fetchFireworksModels, fetchTogetherModels, fetchCohereModels, fetchMistralModels, fetchBedrockModels, fetchPerplexityModels, fetchXaiModels, fetchDeepSeekModels, fetchAI21Models, fetchCerebrasModels, fetchMoonshotModels, fetchZhipuModels } from './fetchModels';

export interface ProviderConfig {
  id: string;
  displayName: string;
  requiresApiKey: boolean;
  logoUrl?: string; // Optional: URL for the provider's logo
  fetcher?: (apiKey: string, endpoint?: string) => Promise<string[]>;
}

const ICON = (slug: string) => `https://unpkg.com/@lobehub/icons-static-svg@latest/icons/${slug}.svg`;

export const PROVIDERS: ProviderConfig[] = [
  {
    id: 'openai',
    displayName: 'OpenAI',
    requiresApiKey: true,
    logoUrl: ICON('openai'),
    fetcher: fetchOpenAIModels,
  },
  {
    id: 'groq',
    displayName: 'Groq',
    requiresApiKey: true,
    logoUrl: ICON('groq'),
    fetcher: fetchGroqModels,
  },
  {
    id: 'fireworks',
    displayName: 'Fireworks',
    requiresApiKey: true,
    logoUrl: ICON('fireworks'),
    fetcher: fetchFireworksModels,
  },
  {
    id: 'together',
    displayName: 'Together',
    requiresApiKey: true,
    logoUrl: ICON('together'),
    fetcher: fetchTogetherModels,
  },
  {
    id: 'azure',
    displayName: 'Azure OpenAI',
    requiresApiKey: true,
    logoUrl: ICON('azure-ai'),
    fetcher: fetchAzureModels, // always returns []
  },
  {
    id: 'anthropic',
    displayName: 'Anthropic',
    requiresApiKey: true,
    logoUrl: ICON('anthropic'),
    fetcher: fetchAnthropicModels,
  },
  {
    id: 'google',
    displayName: 'Google Gemini',
    requiresApiKey: true,
    logoUrl: ICON('gemini'),
    fetcher: fetchGoogleModels, // always returns []
  },
  {
    id: 'openrouter',
    displayName: 'OpenRouter',
    requiresApiKey: true,
    logoUrl: ICON('openrouter'),
    fetcher: fetchOpenRouterModels,
  },
  // --- Additional providers (UI only for now) ---
  {
    id: 'bedrock',
    displayName: 'AWS Bedrock',
    requiresApiKey: true,
    logoUrl: ICON('bedrock'),
    fetcher: fetchBedrockModels,
  },
  {
    id: 'cohere',
    displayName: 'Cohere',
    requiresApiKey: true,
    logoUrl: ICON('cohere'),
    fetcher: fetchCohereModels,
  },
  {
    id: 'mistral',
    displayName: 'Mistral',
    requiresApiKey: true,
    logoUrl: ICON('mistral'),
    fetcher: fetchMistralModels,
  },
  {
    id: 'perplexity',
    displayName: 'Perplexity',
    requiresApiKey: true,
    logoUrl: ICON('perplexity'),
    fetcher: fetchPerplexityModels,
  },
  {
    id: 'xai',
    displayName: 'xAI (Grok)',
    requiresApiKey: true,
    logoUrl: ICON('xai'),
    fetcher: fetchXaiModels,
  },
  {
    id: 'deepseek',
    displayName: 'DeepSeek',
    requiresApiKey: true,
    logoUrl: ICON('deepseek'),
    fetcher: fetchDeepSeekModels,
  },
  {
    id: 'ai21',
    displayName: 'AI21',
    requiresApiKey: true,
    logoUrl: ICON('ai21'),
    fetcher: fetchAI21Models,
  },
  {
    id: 'cerebras',
    displayName: 'Cerebras',
    requiresApiKey: true,
    logoUrl: ICON('cerebras'),
    fetcher: fetchCerebrasModels,
  },
  {
    id: 'moonshot',
    displayName: 'Moonshot AI',
    requiresApiKey: true,
    logoUrl: ICON('moonshot'), // Lobe icons has moonshot support 
    fetcher: fetchMoonshotModels,
  },
  {
    id: 'zhipu',
    displayName: 'Z.AI (GLM)',
    requiresApiKey: true,
    logoUrl: ICON('zhipu'), // Lobe icons has zhipu support
    fetcher: fetchZhipuModels,
  },
];

export function getProviderById(id: string): ProviderConfig | undefined {
  return PROVIDERS.find(p => p.id === id);
}

/**
 * Providers the edge completions route actually registers a service for.
 *
 * Every entry in PROVIDERS can list models, but only these can run a lane:
 * the rest return "provider not found" the moment a race starts. The list is
 * the side-effect import block at the top of
 * pages/api/providers/[providerId]/completions.ts, and
 * utils/__tests__/raceableProviders.test.ts reads that file to keep the two in
 * step. Kept here so the homepage and the methodology page can state the count
 * instead of hardcoding it.
 */
export const RACEABLE_PROVIDER_IDS = [
  'openai',
  'groq',
  'anthropic',
  'google',
  'cohere',
  'mistral',
  'together',
  'fireworks',
  'openrouter',
  'cerebras',
  'moonshot',
  'zhipu',
] as const;

export const RACEABLE_PROVIDERS: ProviderConfig[] = PROVIDERS.filter(p =>
  (RACEABLE_PROVIDER_IDS as readonly string[]).includes(p.id),
);
