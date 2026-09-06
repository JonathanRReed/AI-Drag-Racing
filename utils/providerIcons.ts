// Lobe icon names, which do not always match Simple Icons or provider API IDs.
export function providerSlugs(providerId: string): string[] {
  switch (providerId) {
    case 'google': return ['gemini', 'google'];
    case 'azure': return ['azure', 'azureai'];
    case 'together': return ['together'];
    case 'fireworks': return ['fireworks'];
    case 'bedrock': return ['aws', 'bedrock'];
    case 'xai': return ['xai'];
    case 'moonshot': return ['moonshot', 'kimi'];
    case 'zhipu': return ['zhipu', 'chatglm'];
    default: return [providerId];
  }
}
