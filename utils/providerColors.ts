// utils/providerColors.ts
// Per-provider data-ink identity for the OLED (#090a0c) theme.
//
// Goals:
//  - Every one of the 18 providers in utils/providers.ts gets a UNIQUE, memorable hue
//    so lanes, the live pace chart, standings, podium and bar charts all agree.
//  - All hues are tuned for >= ~4.5:1 contrast on near-black and kept clear of the
//    violet/indigo band (the source file's longstanding "no purple" rule).
//  - Any future / unknown provider id gets a STABLE distinct color via a hash fallback
//    instead of collapsing to a single shared cyan.
//
// `solid` = full-strength line / dot / glow color.
// `soft`  = same hue at 0.65 alpha for chart fills and tints.

export interface ProviderColor {
  solid: string;
  soft: string;
}

// Hand-tuned, mutually-distinct palette (no purple/violet/indigo).
const PROVIDER_SOLIDS: Record<string, string> = {
  openai: '#12D7C6', // teal
  anthropic: '#F2A35E', // clay / tan
  google: '#4F9DF9', // blue
  groq: '#FF6F5E', // coral
  fireworks: '#FF4FA3', // hot pink
  together: '#2BD4A0', // jade
  azure: '#59C2F7', // sky
  openrouter: '#9AA4B2', // slate
  bedrock: '#FF9F40', // orange
  cohere: '#EC74C9', // orchid pink
  mistral: '#FBBF24', // amber
  perplexity: '#22D3EE', // cyan
  xai: '#E6E8EB', // near-white
  deepseek: '#6E8BFF', // cornflower blue
  ai21: '#B6E84F', // lime
  cerebras: '#FF7A45', // burnt orange
  moonshot: '#7FE0C0', // mint
  zhipu: '#5BD66E', // green
};

function hexToSoft(hex: string, alpha = 0.65): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Deterministic fallback: stable hue per id, nudged out of the violet/indigo band
// so unknown providers stay on-brand and never collide on a single default color.
function hashHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) % 360;
  }
  // Push hues out of 255..300 (violet/indigo) to honor the "no purple" rule.
  if (h >= 255 && h <= 300) h = (h + 75) % 360;
  return h;
}

function hslToHex(hh: number, s: number, l: number): string {
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + hh / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const cache = new Map<string, ProviderColor>();

export function getProviderColor(providerId: string): ProviderColor {
  const key = providerId || 'unknown';
  const cached = cache.get(key);
  if (cached) return cached;

  let solid = PROVIDER_SOLIDS[key];
  if (!solid) {
    // Stable, OLED-friendly fallback.
    solid = hslToHex(hashHue(key), 78, 0.66);
  }
  const color: ProviderColor = { solid, soft: hexToSoft(solid) };
  cache.set(key, color);
  return color;
}

// Back-compat alias (some modules referenced the raw map historically).
export const providerColorMap: Record<string, ProviderColor> = Object.fromEntries(
  Object.entries(PROVIDER_SOLIDS).map(([id, solid]) => [id, { solid, soft: hexToSoft(solid) }])
);
