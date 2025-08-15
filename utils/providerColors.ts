// utils/providerColors.ts
// OLED palette mapping (no purple). Soft colors ~65% opacity for glass charts.
export const providerColorMap: Record<string, { solid: string; soft: string }> = {
  // Charts order reference: cyan, peach, emerald, info blue, amber, rose
  openai:    { solid: '#22D3EE', soft: 'rgba(34,211,238,0.65)' },  // cyan
  groq:      { solid: '#FFB86B', soft: 'rgba(255,184,107,0.65)' }, // peach
  anthropic: { solid: '#34D399', soft: 'rgba(52,211,153,0.65)' },  // emerald
  google:    { solid: '#60A5FA', soft: 'rgba(96,165,250,0.65)' },  // info blue
  cohere:    { solid: '#F59E0B', soft: 'rgba(245,158,11,0.65)' },  // amber
  mistral:   { solid: '#FB7185', soft: 'rgba(251,113,133,0.65)' }, // rose
  openrouter:{ solid: '#22D3EE', soft: 'rgba(34,211,238,0.65)' },  // default cyan
  bedrock:   { solid: '#34D399', soft: 'rgba(52,211,153,0.65)' },  // emerald
  together:  { solid: '#FFB86B', soft: 'rgba(255,184,107,0.65)' }, // peach
};

export function getProviderColor(providerId: string) {
  return providerColorMap[providerId] || { solid: '#38bdf8', soft: 'rgba(56,189,248,0.7)' }; // default cyan
}
