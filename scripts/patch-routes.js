#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', '.vercel', 'output', 'static');
const routesPath = path.join(outDir, '_routes.json');

if (!fs.existsSync(outDir)) {
  console.warn(`[patch-routes] Output dir not found: ${outDir}. Did you run 'npm run build:cf'?`);
  process.exit(0);
}

const routes = {
  version: 1,
  description: 'Only run Functions for API and Next data/image; serve root as static.',
  include: ['/api/*', '/_next/data/*', '/_next/image*'],
  exclude: ['/_next/static/*']
};

fs.writeFileSync(routesPath, JSON.stringify(routes));
console.log(`[patch-routes] Wrote ${routesPath}`);

// Ensure _redirects exists (fallback for "/" -> "/index")
const redirectsSrc = path.join(__dirname, '..', 'public', '_redirects');
const redirectsDst = path.join(outDir, '_redirects');
try {
  if (fs.existsSync(redirectsSrc)) {
    fs.copyFileSync(redirectsSrc, redirectsDst);
    console.log(`[patch-routes] Copied ${redirectsSrc} -> ${redirectsDst}`);
  } else {
    fs.writeFileSync(redirectsDst, '/ /index 200\n');
    console.log(`[patch-routes] Created fallback _redirects at ${redirectsDst}`);
  }
} catch (e) {
  console.warn(`[patch-routes] Could not ensure _redirects: ${e.message}`);
}
