// Lobe icon names, which do not always match Simple Icons or provider API IDs.

// Bolt optimization: Pre-allocated static slug arrays prevent array allocations
// during icon slug lookups in provider lists and model selectors.
const STATIC_PROVIDER_SLUGS: Record<string, readonly string[]> = {
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
  return STATIC_PROVIDER_SLUGS[providerId] || [providerId];
}
