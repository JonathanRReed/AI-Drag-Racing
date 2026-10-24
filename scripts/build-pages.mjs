import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import audit from './dependency-audit.cjs';

export function bundleWorker(cwd, outfile) {
  return build({
    absWorkingDir: cwd, entryPoints: ['worker/index.ts'], outfile,
    bundle: true, format: 'esm', platform: 'browser', target: 'es2022',
    metafile: true, sourcemap: false, legalComments: 'none',
    // No process.env substitution, external imports or generated Node shims.
  });
}

export function writeStaticPolicies(cwd, output) {
  fs.writeFileSync(path.join(output, '_routes.json'), JSON.stringify({ version: 1, include: ['/api/*'], exclude: [] }) + '\n');
  fs.copyFileSync(path.join(cwd, 'public/_redirects'), path.join(output, '_redirects'));
  // next-on-pages previously added this immutable rule from Vercel's hit route.
  const headers = fs.readFileSync(path.join(cwd, 'public/_headers'), 'utf8');
  fs.writeFileSync(path.join(output, '_headers'), headers + '\n/_next/static/*\n  Cache-Control: public,max-age=31536000,immutable\n');
}

export function verifyStaticExport(output) {
  for (const page of ['index', '404', 'about', 'contact', 'methodology', 'privacy', 'subprocessors', 'share/[id]']) {
    if (!fs.existsSync(path.join(output, `${page}.html`))) throw new Error(`Missing static page: ${page}`);
  }
  if (fs.existsSync(path.join(output, 'api'))) throw new Error('Unexpected static API export');
  const html = fs.readFileSync(path.join(output, 'share/[id].html'), 'utf8');
  const data = JSON.parse(html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/)?.[1] ?? 'null');
  if (!data || data.page !== '/share/[id]' || data.nextExport !== true || data.autoExport !== true || Object.keys(data.query).length) throw new Error('Share shell hydration contract changed');
  for (const match of html.matchAll(/<script[^>]+src="(\/_next\/static\/[^"?]+)(?:[^" ]*)"/g)) {
    if (!fs.existsSync(path.join(output, decodeURIComponent(match[1])))) throw new Error('Missing share shell client chunk');
  }
}

export async function buildPages(cwd = process.cwd()) {
  const run = (command, args, env = process.env) => execFileSync(command, args, { cwd, env, stdio: 'inherit' });
  // Keep the existing production share guard before any publishable artifact.
  run('bun', ['scripts/verify-share-config.mjs']);
  run('bun', ['run', 'build:theme']);
  run('bun', ['scripts/dependency-audit.cjs', 'audit']);
  run('bun', ['scripts/dependency-audit.cjs', 'prepare']);
  const preparation = JSON.parse(fs.readFileSync(path.join(cwd, '.cache/dependency-audit/build-run.json'), 'utf8'));
  run('bun', ['scripts/verify-react-runtime.mjs']);
  run(process.execPath, [path.join(cwd, 'node_modules/next/dist/bin/next'), 'build'], {
    ...process.env, PAGES_BUILD: '1', DEPENDENCY_AUDIT_RUN_ID: preparation.id,
  });
  const exported = path.join(cwd, 'out');
  verifyStaticExport(exported);
  // Only generated output in this checkout is replaced. Never copy Next server
  // bundles, .next caches, source maps or build metadata into the deployment.
  const outputRoot = path.join(cwd, '.vercel/output');
  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputRoot, { recursive: true });
  const output = path.join(outputRoot, 'static');
  fs.renameSync(exported, output);
  writeStaticPolicies(cwd, output);
  const result = await bundleWorker(cwd, path.join(output, '_worker.js'));
  // The bundle is pure application code: inspect the actual exported route
  // descriptors, without starting a server or contacting any provider.
  const worker = await import(`data:text/javascript;base64,${fs.readFileSync(path.join(output, '_worker.js')).toString('base64')}`);
  audit.recordNativeBuild(cwd, result.metafile, worker.apiRoutes.map(route => route.path));
  run('bun', ['scripts/dependency-audit.cjs', 'verify']);
  console.log('Native Cloudflare Pages artifact verified at .vercel/output/static.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildPages();
}
