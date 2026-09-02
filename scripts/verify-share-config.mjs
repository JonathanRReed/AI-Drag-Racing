// Git-based Pages builds must never silently publish disabled sharing.
if (process.env.CF_PAGES === '1' && process.env.CF_PAGES_BRANCH === 'main') {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url !== 'https://bgbqdzmgxkwstjihgeef.supabase.co' || !key) {
    throw new Error('Production share configuration missing. Configure the public URL in Wrangler and the anonymous key in Pages encrypted environment settings.');
  }
  if (!key.startsWith('sb_publishable_')) {
    const claims = JSON.parse(Buffer.from(key.split('.')[1] ?? '', 'base64url').toString());
    if (claims.role !== 'anon' || claims.ref !== 'bgbqdzmgxkwstjihgeef') {
      throw new Error('Sharing requires the matching public anonymous key, never a service-role credential.');
    }
  }
  console.log('Production share configuration verified.');
}
