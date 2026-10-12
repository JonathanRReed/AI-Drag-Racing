// Lobe icon names, which do not always match Simple Icons or provider API IDs.

// Known providers share immutable slug candidates across icon renders.
// Unknown IDs retain the original one-element fallback without being cached.
const STATIC_PROVIDER_SLUGS: Record<string, readonly string[]> = {
  openai: ['openai'],
  groq: ['groq'],
  anthropic: ['anthropic'],
  openrouter: ['openrouter'],
  cohere: ['cohere'],
  mistral: ['mistral'],
  perplexity: ['perplexity'],
  deepseek: ['deepseek'],
  ai21: ['ai21'],
  cerebras: ['cerebras'],
  google: ['gemini', 'google'],
  azure: ['azure', 'azureai'],
  together: ['together'],
  fireworks: ['fireworks'],
  bedrock: ['aws', 'bedrock'],
  xai: ['xai'],
  moonshot: ['moonshot', 'kimi'],
  zhipu: ['zhipu', 'chatglm'],
};

export function providerSlugs(providerId: string): readonly string[] {
  return Object.hasOwn(STATIC_PROVIDER_SLUGS, providerId)
    ? STATIC_PROVIDER_SLUGS[providerId]
    : [providerId];
}
