import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('hosted share network policy', () => {
  it('permits the exact shared backend without a Supabase wildcard', () => {
    const headers = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
    const connect = headers.match(/connect-src ([^;]+)/)?.[1].split(/\s+/) ?? [];
    expect(connect).toContain('https://bgbqdzmgxkwstjihgeef.supabase.co');
    expect(connect).not.toContain('https://*.supabase.co');
    expect(connect).not.toContain('*');
  });
});
