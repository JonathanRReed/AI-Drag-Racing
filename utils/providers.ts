// Centralized provider config for model fetching and display
// Add new providers here for easy extensibility

import { fetchOpenAIModels, fetchGroqModels, fetchAnthropicModels, fetchGoogleModels, fetchAzureModels, fetchOpenRouterModels, fetchFireworksModels, fetchTogetherModels, fetchCohereModels, fetchMistralModels, fetchBedrockModels, fetchPerplexityModels, fetchXaiModels, fetchDeepSeekModels, fetchAI21Models, fetchCerebrasModels } from './fetchModels';

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
];

export function getProviderById(id: string): ProviderConfig | undefined {
  return PROVIDERS.find(p => p.id === id);
}
