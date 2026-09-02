import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('production share build configuration', () => {
  const run = (values: Record<string, string>) => spawnSync(process.execPath, ['scripts/verify-share-config.mjs'], {
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '', CF_PAGES: '1', CF_PAGES_BRANCH: 'main', ...values },
    encoding: 'utf8',
  });
  it('stops a production build with missing share configuration', () => {
    expect(run({}).status).not.toBe(0);
  });
  it('allows local builds and correct publishable configuration', () => {
    expect(run({ CF_PAGES: '0' }).status).toBe(0);
    expect(run({ NEXT_PUBLIC_SUPABASE_URL: 'https://bgbqdzmgxkwstjihgeef.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_test_fixture' }).status).toBe(0);
  });
  it('rejects service-role credentials', () => {
    const claims = Buffer.from(JSON.stringify({ role: 'service_role', ref: 'bgbqdzmgxkwstjihgeef' })).toString('base64url');
    expect(run({ NEXT_PUBLIC_SUPABASE_URL: 'https://bgbqdzmgxkwstjihgeef.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: `header.${claims}.fixture` }).status).not.toBe(0);
  });
});
