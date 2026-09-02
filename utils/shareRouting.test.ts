import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('shared receipt routing', () => {
  it('rewrites unlisted share URLs to the static Next.js route', () => {
    const redirects = readFileSync('public/_redirects', 'utf8');
    expect(redirects.split('\n')).toContain('/share/* /share/[id] 200');
  });
});
