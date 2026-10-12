import { describe, expect, it } from 'vitest';
import { providerSlugs } from './providerIcons';
import { PROVIDERS } from './providers';

const aliases: Record<string, string[]> = {
  google: ['gemini', 'google'], azure: ['azure', 'azureai'], together: ['together'],
  fireworks: ['fireworks'], bedrock: ['aws', 'bedrock'], xai: ['xai'],
  moonshot: ['moonshot', 'kimi'], zhipu: ['zhipu', 'chatglm'],
};

describe('provider icon candidates', () => {
  it.each(['constructor', 'toString', '__proto__', 'hasOwnProperty', 'valueOf', 'unknown-provider', ''])('keeps the fallback array contract for %j', id => {
      expect(providerSlugs(id)).toEqual([id]);
      expect(Array.isArray(providerSlugs(id))).toBe(true);
    });

  it.each(PROVIDERS.map(provider => provider.id))('keeps candidate order and stable references for %s', id => {
    expect(providerSlugs(id)).toEqual(aliases[id] ?? [id]);
    expect(providerSlugs(id)).toBe(providerSlugs(id));
  });

  it('does not retain arrays for arbitrary unknown IDs', () => {
    expect(providerSlugs('new-provider')).not.toBe(providerSlugs('new-provider'));
  });
});
