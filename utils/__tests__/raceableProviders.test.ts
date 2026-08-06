import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PROVIDERS, RACEABLE_PROVIDERS, RACEABLE_PROVIDER_IDS } from '../providers';

/**
 * The homepage prints "N of M providers can race" from RACEABLE_PROVIDER_IDS.
 * That number is only true while the list matches the services the edge
 * completions route imports, so read the route and compare.
 */
function providerIdsRegisteredByCompletionsRoute(): string[] {
  const routePath = path.join(
    process.cwd(),
    'pages/api/providers/[providerId]/completions.ts',
  );
  const source = readFileSync(routePath, 'utf8');
  return [...source.matchAll(/utils\/providers\/([a-z0-9]+)'/g)].map(m => m[1]);
}

describe('RACEABLE_PROVIDER_IDS', () => {
  it('matches the services registered by the completions route', () => {
    expect([...RACEABLE_PROVIDER_IDS].sort()).toEqual(
      providerIdsRegisteredByCompletionsRoute().sort(),
    );
  });

  it('only names providers that are listed in the sidebar', () => {
    expect(RACEABLE_PROVIDERS).toHaveLength(RACEABLE_PROVIDER_IDS.length);
    expect(RACEABLE_PROVIDERS.length).toBeLessThan(PROVIDERS.length);
  });
});
