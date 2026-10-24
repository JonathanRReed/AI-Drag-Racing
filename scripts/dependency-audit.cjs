const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync, spawnSync } = require('node:child_process');

const ADVISORY = 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm';
const EXPIRES_AT = '2026-10-18T05:00:00.000Z';
const FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
const CACHE = '.cache/dependency-audit';
const GRAPH_DIR = '.next/dependency-audit';
const LABELS = ['browser', 'edge', 'nodejs'];
const API_SOURCES = ['pages/api/bedrock-models.ts', 'pages/api/models.ts', 'pages/api/providers/[providerId]/completions.ts'];
const RETIRED = /^(?:@cloudflare\/next-on-pages|vercel|@vercel\/.*|wrangler|miniflare)$/;
const FORBIDDEN = ['braces', 'micromatch', 'fast-glob', 'chokidar', 'shadcn', 'ts-morph', '@ts-morph/common', '@next/eslint-plugin-next', 'eslint-config-next', '@cloudflare/next-on-pages', 'vercel', '@vercel/express', '@vercel/hono', '@vercel/hydrogen', '@vercel/node', '@vercel/redwood', '@vercel/remix-builder', '@vercel/static-build', '@vercel/static-config', 'wrangler', 'miniflare', 'zod', 'zod-validation-error'];
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fail = message => { throw new Error(`Dependency verification blocked: ${message}`); };
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const isJavaScriptFile = file => /\.(?:js|mjs|cjs)$/i.test(file);

function packageSegments(key) {
  const parts = key.split('/');
  const packages = [];
  for (let i = 0; i < parts.length; i++) {
    packages.push(parts[i].startsWith('@') ? `${parts[i]}/${parts[++i]}` : parts[i]);
  }
  return packages;
}

function resolveLockedPackage(packages, parent, dependency) {
  const parents = parent ? packageSegments(parent) : [];
  while (true) {
    const candidate = [...parents, dependency].join('/');
    if (Object.hasOwn(packages, candidate)) return candidate;
    if (!parents.length) return null;
    parents.pop();
  }
}

function collectConsumerGraph(lock) {
  if (!isRecord(lock) || !isRecord(lock.packages) || !isRecord(lock.workspaces)) fail('invalid lockfile');
  const targets = Object.entries(lock.packages).filter(([, entry]) => Array.isArray(entry) && typeof entry[0] === 'string' && entry[0].startsWith('braces@'));
  if (targets.length !== 1 || targets[0][0] !== 'braces' || targets[0][1][0] !== 'braces@3.0.3') fail('unexpected locked braces version or alias');
  const edges = [];
  const addEdges = (parent, metadata, scope) => {
    if (!isRecord(metadata)) fail('invalid dependency metadata');
    for (const field of FIELDS) {
      if (metadata[field] === undefined) continue;
      if (!isRecord(metadata[field])) fail('invalid dependency metadata');
      for (const [name, requested] of Object.entries(metadata[field])) {
        if (typeof requested !== 'string') fail('invalid dependency range');
        const child = resolveLockedPackage(lock.packages, scope, name);
        if (child) edges.push([parent, field, name, requested, child]);
        else if (name === 'braces' || requested.startsWith('npm:braces@')) fail('unresolved braces consumer');
      }
    }
  };
  for (const [key, entry] of Object.entries(lock.packages)) {
    if (!Array.isArray(entry) || typeof entry[0] !== 'string') fail('invalid locked package');
    addEdges(key, entry[2] || {}, key);
  }
  for (const [key, workspace] of Object.entries(lock.workspaces)) addEdges(`workspace:${key}`, workspace, '');
  const consumers = new Set(['braces']);
  const acceptedEdges = new Map();
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of edges) {
      if (!consumers.has(edge[4])) continue;
      acceptedEdges.set(JSON.stringify(edge), edge);
      if (!consumers.has(edge[0])) {
        consumers.add(edge[0]);
        changed = true;
      }
    }
  }
  const sort = entries => entries.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), 'en'));
  return {
    nodes: sort([...consumers].filter(key => !key.startsWith('workspace:')).map(key => [key, lock.packages[key][0]])),
    edges: sort([...acceptedEdges.values()]),
  };
}

function validateAudit({ report, status, stderr = '', lock, installedBracesVersion, now = new Date(), policy }) {
  if (typeof stderr !== 'string' || stderr.trim()) fail('audit process reported error output');
  if (!isRecord(report) || ![0, 1].includes(status)) fail('failed audit process or malformed report');
  const entries = Object.entries(report);
  if (entries.length === 0) {
    if (status !== 0) fail('audit request failed');
    return { accepted: false, warning: null };
  }
  if (status !== 1 || entries.length !== 1 || entries[0][0] !== 'braces' || !Array.isArray(entries[0][1]) || entries[0][1].length !== 1) fail('unapproved vulnerability');
  const finding = entries[0][1][0];
  if (!isRecord(finding) || finding.id !== 1240992 || finding.url !== ADVISORY || finding.severity !== 'high' || finding.vulnerable_versions !== '<=3.0.3' || typeof finding.title !== 'string' || !finding.title) fail('unapproved or malformed advisory');
  if (!isRecord(policy) || policy.expiresAt !== EXPIRES_AT || !Number.isFinite(now.getTime())) fail('invalid exception policy or date');
  if (now.getTime() >= Date.parse(EXPIRES_AT)) fail('temporary braces exception expired');
  if (installedBracesVersion !== '3.0.3') fail('unexpected installed braces version');
  if (!same(collectConsumerGraph(lock), policy.consumerGraph)) fail('braces consumer graph changed; review is required');
  return {
    accepted: true,
    warning: `Temporary build-tool availability risk accepted: GHSA-vfj7-8cjw-p6xm, braces 3.0.3, expires ${EXPIRES_AT}. All other findings block. Fresh runtime-exclusion verification is required.`,
  };
}

function classifyRuntimeModule({ identifier = '', resource = '' }) {
  // CSS is intentionally used without importing the shadcn CLI JavaScript.
  if (resource && /\/shadcn\/dist\/tailwind\.css(?:\?|$)/.test(resource.replace(/\\/g, '/'))) return [];
  const value = `${resource || ''} ${identifier}`.replace(/\\/g, '/');
  return FORBIDDEN.filter(name => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|[/"' ])${escaped}(?:[/"' ?]|$)`).test(value);
  });
}

function validateRuntimeEvidence({ run, source, graphs, now = new Date() }) {
  if (!isRecord(run) || typeof run.id !== 'string' || !run.id || !same(run.source, source) || !Number.isFinite(Date.parse(run.startedAt)) || !Number.isFinite(now.getTime())) fail('invalid build preparation');
  if (!Array.isArray(graphs) || graphs.length !== LABELS.length || new Set(graphs.map(graph => graph?.label)).size !== LABELS.length) fail('missing or duplicate compiler evidence');
  for (const graph of graphs) {
    if (!isRecord(graph) || graph.schemaVersion !== 1 || !LABELS.includes(graph.label) || graph.runId !== run.id || !same(graph.source, source) || !Number.isInteger(graph.moduleCount) || graph.moduleCount <= 0) fail('missing or stale compiler evidence');
    const generated = Date.parse(graph.generatedAt);
    if (!Number.isFinite(generated) || generated < Date.parse(run.startedAt) || generated > now.getTime()) fail('stale compiler timestamp');
    if (!Array.isArray(graph.forbiddenModules) || graph.forbiddenModules.length) fail('forbidden dependency in runtime compilation');
    if (!Array.isArray(graph.shadcnFiles) || graph.shadcnFiles.some(file => !['dist/tailwind.css', 'package.json'].includes(file))) fail('shadcn CLI input entered runtime compilation');
    if (graph.label === 'browser' && !graph.shadcnFiles.includes('dist/tailwind.css')) fail('missing shadcn CSS-only provenance');
  }
  return { verified: true };
}

function isNativeInput(input) {
  return typeof input === 'string' && !input.split('/').includes('..') && (
    input === 'worker/index.ts' || input === 'lib/security-headers.json' ||
    API_SOURCES.includes(input) || /^utils\/[a-zA-Z0-9_./-]+\.ts$/.test(input)
  ) && classifyRuntimeModule({ identifier: input }).length === 0;
}

function verifyApiSourceFiles(cwd) {
  const apiFiles = [];
  const visit = relative => {
    const location = path.join(cwd, relative);
    const entry = fs.lstatSync(location);
    if (entry.isSymbolicLink()) fail('unexpected source API symlink');
    if (entry.isDirectory()) {
      for (const child of fs.readdirSync(location)) visit(`${relative}/${child}`);
    } else if (entry.isFile()) apiFiles.push(relative);
    else fail('unexpected source API file type');
  };
  visit('pages/api');
  apiFiles.sort();
  if (!same(apiFiles, [...API_SOURCES].sort())) fail('source API file set changed; review native routing');
  return { apiFiles };
}

function validateNativeRoutes({ routes, workerExists }) {
  const expected = API_SOURCES.map(file => '/' + file.slice(6, -3)).sort();
  if (!Array.isArray(routes) || !same(routes.map(route => route?.name).sort(), expected) || workerExists !== true) fail('native handler set or worker changed; review runtime reachability');
  let mappedSources = 0;
  for (const route of routes) {
    if (route.runtime !== 'fetch' || !Array.isArray(route.sources) || !route.sources.length || route.sourceRoot !== '') fail('invalid native Fetch handler evidence');
    if (route.sources.some(input => !isNativeInput(input)) || !route.sources.includes(`pages${route.name}.ts`)) fail('invalid or forbidden native handler input');
    mappedSources += route.sources.length;
  }
  return { mappedSources };
}

function validateNativeInputs(inputs) {
  if (!Array.isArray(inputs) || !inputs.length || inputs.some(input => !isNativeInput(input))) fail('invalid or forbidden native worker input');
  for (const input of ['worker/index.ts', ...API_SOURCES]) if (!inputs.includes(input)) fail('missing actual native worker or handler input');
  return { inputCount: inputs.length };
}

function validateWorkerEvidence({ run, source, records, files, now = new Date() }) {
  if (!isRecord(run) || !same(run.source, source) || !Array.isArray(records) || records.length !== 1 || !Array.isArray(files) || files.length !== 1 || files[0]?.name !== '_worker.js') fail('missing or extra native worker build metadata');
  const record = records[0];
  const generated = Date.parse(record?.generatedAt);
  if (!isRecord(record) || record.schemaVersion !== 1 || record.runId !== run.id || !same(record.source, source) || record.output !== '_worker.js' || !/^[a-f0-9]{64}$/.test(record.outputHash) || !Number.isFinite(generated) || generated < Date.parse(run.startedAt) || generated > now.getTime()) fail('stale or malformed worker build metadata');
  validateNativeInputs(record.inputs);
  if (!Array.isArray(record.imports) || record.imports.length) fail('unbundled native worker runtime import');
  const file = files[0];
  if (!isRecord(file) || !/^[a-f0-9]{64}$/.test(file.hash) || record.outputHash !== file.hash) fail('uncovered or changed worker JavaScript');
  return { verified: true, files: 1 };
}

function verifyRetiredTooling(cwd) {
  const lock = readLock(cwd);
  for (const [key, entry] of Object.entries(lock.packages)) {
    const name = entry[0].slice(0, entry[0].lastIndexOf('@'));
    if (RETIRED.test(name) || packageSegments(key).some(name => RETIRED.test(name))) fail('retired deployment tooling remains in lockfile');
  }
  let packageCount = 0;
  const visit = folder => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const location = path.join(folder, entry.name);
      if (entry.name.startsWith('@')) { visit(location); continue; }
      if (entry.isSymbolicLink()) fail('unexpected installed package symlink');
      if (!entry.isDirectory()) continue;
      const manifest = readJSON(path.join(location, 'package.json'));
      packageCount++;
      if (RETIRED.test(manifest.name)) fail('retired deployment tooling remains installed');
      if (fs.existsSync(path.join(location, 'node_modules'))) visit(path.join(location, 'node_modules'));
    }
  };
  visit(path.join(cwd, 'node_modules'));
  return { packageCount };
}

function sourceStamp(cwd) {
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim();
  const files = execFileSync('git', ['ls-files', '-z'], { cwd, encoding: 'utf8' }).split('\0').filter(Boolean).sort();
  if (!/^[a-f0-9]{40}$/.test(commit) || !files.length) fail('missing Git source identity');
  const digest = crypto.createHash('sha256');
  for (const file of files) digest.update(file).update('\0').update(fs.readFileSync(path.join(cwd, file))).update('\0');
  return { commit, sourceHash: digest.digest('hex'), lockHash: hash(fs.readFileSync(path.join(cwd, 'bun.lock'))) };
}

function parseJSONEvidence(text) {
  try { return JSON.parse(text); }
  catch { fail('malformed JSON evidence'); }
}
function readJSON(file) { return parseJSONEvidence(fs.readFileSync(file, 'utf8')); }
function writeJSON(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}
function loadPolicy(cwd) { return readJSON(path.join(cwd, 'scripts/braces-exception-consumers.json')); }
function readLock(cwd) {
  if (typeof Bun === 'undefined' || !Bun.JSONC) fail('use the pinned Bun runtime to read the lockfile');
  return Bun.JSONC.parse(fs.readFileSync(path.join(cwd, 'bun.lock'), 'utf8'));
}
function validateCurrentAudit(cwd, now = new Date()) {
  const results = ['', 'production-'].map(prefix => {
    const metadata = readJSON(path.join(cwd, CACHE, `${prefix}result.json`));
    if (metadata.processFailed !== false) fail('audit process did not complete');
    if (!same(metadata.source, sourceStamp(cwd))) fail('audit evidence belongs to another source tree');
    const report = readJSON(path.join(cwd, CACHE, `${prefix}report.json`));
    const installed = Object.hasOwn(report, 'braces') ? readJSON(path.join(cwd, 'node_modules/braces/package.json')).version : undefined;
    const stderr = fs.readFileSync(path.join(cwd, CACHE, `${prefix}process-stderr.txt`), 'utf8');
    return validateAudit({ report, status: metadata.status, stderr, lock: readLock(cwd), installedBracesVersion: installed, now, policy: loadPolicy(cwd) });
  });
  return { accepted: results.some(result => result.accepted), warning: results.find(result => result.warning)?.warning ?? null };
}

function warn(message) {
  if (!message) return;
  console.warn(`::warning title=Temporary braces exception::${message}`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\nWarning: ${message}\n`);
}

function runAudit(cwd) {
  verifyRetiredTooling(cwd);
  for (const [prefix, flags] of [['', []], ['production-', ['--production']]]) {
    const result = spawnSync(process.execPath, ['audit', ...flags, '--json'], { cwd, encoding: 'utf8', timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
    // Preserve both complete unfiltered responses and failure outputs.
    const reportFile = path.join(cwd, CACHE, `${prefix}report.json`);
    fs.mkdirSync(path.dirname(reportFile), { recursive: true });
    fs.writeFileSync(reportFile, result.stdout || '');
    fs.writeFileSync(path.join(cwd, CACHE, `${prefix}process-stderr.txt`), result.stderr || '');
    writeJSON(path.join(cwd, CACHE, `${prefix}result.json`), { status: result.status, processFailed: !!(result.error || result.signal), source: sourceStamp(cwd), capturedAt: new Date().toISOString() });
    if (result.error || result.signal) fail('audit process did not complete');
    console.log(JSON.stringify(parseJSONEvidence(result.stdout), null, 2));
  }
  const validation = validateCurrentAudit(cwd);
  warn(validation.warning);
  if (!validation.accepted) console.log('Dependency audit: no vulnerabilities reported in full or production graph.');
}

function prepare(cwd) {
  verifyApiSourceFiles(cwd);
  const validation = validateCurrentAudit(cwd);
  warn(validation.warning);
  fs.rmSync(path.join(cwd, GRAPH_DIR), { recursive: true, force: true });
  fs.rmSync(path.join(cwd, CACHE, 'worker-builds'), { recursive: true, force: true });
  writeJSON(path.join(cwd, CACHE, 'build-run.json'), { id: crypto.randomUUID(), startedAt: new Date().toISOString(), source: sourceStamp(cwd) });
}

function verifyPagesBuildContext(cwd, env = process.env) {
  if (env.CF_PAGES !== '1') return;
  const blocked = () => fail('Cloudflare Pages must use bun run build:pages with matching source-bound preparation');
  if (env.PAGES_BUILD !== '1' || !env.DEPENDENCY_AUDIT_RUN_ID) blocked();
  let run;
  try { run = readJSON(path.join(cwd, CACHE, 'build-run.json')); }
  catch { blocked(); }
  if (!isRecord(run) || run.id !== env.DEPENDENCY_AUDIT_RUN_ID || !same(run.source, sourceStamp(cwd))) blocked();
}

function createRuntimeModulePlugin(cwd, label) {
  const runFile = path.join(cwd, CACHE, 'build-run.json');
  if (!fs.existsSync(runFile)) return null;
  const run = readJSON(runFile);
  const source = sourceStamp(cwd);
  if (!same(run.source, source)) fail('source changed after build preparation');
  return {
    apply(compiler) {
      compiler.hooks.afterEmit.tap('DependencyRuntimeExclusion', compilation => {
        const seen = new Set();
        const forbidden = new Set();
        const shadcnFiles = new Set();
        const bundledVendorInputs = new Set();
        const visitCompilation = current => {
          const visitModule = module => {
            if (seen.has(module)) return;
            seen.add(module);
            const identifier = module.identifier().replace(/\\/g, '/');
            const vendor = identifier.match(/next\/dist\/compiled\/[^ ?\"!]+/g);
            for (const input of vendor || []) bundledVendorInputs.add(input);
            for (const name of classifyRuntimeModule({ identifier: module.identifier(), resource: module.resource })) forbidden.add(name);
            if (module.modules) for (const nested of module.modules) visitModule(nested);
          };
          for (const module of current.modules) visitModule(module);
          for (const file of current.fileDependencies) {
            const normalized = file.replace(/\\/g, '/');
            const marker = '/node_modules/shadcn/';
            const index = normalized.lastIndexOf(marker);
            if (index !== -1) shadcnFiles.add(normalized.slice(index + marker.length));
          }
          for (const child of current.children) visitCompilation(child);
        };
        visitCompilation(compilation);
        writeJSON(path.join(cwd, GRAPH_DIR, `${label}.json`), {
          schemaVersion: 1, label, runId: run.id, source,
          generatedAt: new Date().toISOString(), moduleCount: seen.size,
          forbiddenModules: [...forbidden].sort(), shadcnFiles: [...shadcnFiles].sort(), bundledVendorInputs: [...bundledVendorInputs].sort(),
        });
      });
    },
  };
}

function verifyRuntime(cwd) {
  verifyApiSourceFiles(cwd);
  const validation = validateCurrentAudit(cwd);
  const installed = verifyRetiredTooling(cwd);
  warn(validation.warning);
  const run = readJSON(path.join(cwd, CACHE, 'build-run.json'));
  const graphs = LABELS.map(label => readJSON(path.join(cwd, GRAPH_DIR, `${label}.json`)));
  const source = sourceStamp(cwd);
  validateRuntimeEvidence({ run, source, graphs });
  const recordsDir = path.join(cwd, CACHE, 'worker-builds');
  const records = fs.readdirSync(recordsDir).map(file => readJSON(path.join(recordsDir, file)));
  const output = path.join(cwd, '.vercel/output/static');
  const workerPath = path.join(output, '_worker.js');
  if (!fs.lstatSync(workerPath).isFile()) fail('unexpected worker artifact directory or symlink');
  const files = [{ name: '_worker.js', hash: hash(fs.readFileSync(workerPath)) }];
  const worker = validateWorkerEvidence({ run, source, records, files });
  const routes = readJSON(path.join(cwd, CACHE, 'native-routes.json'));
  const { mappedSources } = validateNativeRoutes({ routes, workerExists: true });
  if (!same(routes.map(route => route.sources), routes.map(() => records[0].inputs))) fail('native route evidence not derived from actual worker inputs');
  const visit = folder => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) fail('unexpected deployed artifact symlink');
      if (entry.isDirectory()) visit(path.join(folder, entry.name));
      else if (entry.name.endsWith('.map')) fail('source map in deployed artifact');
    }
  };
  visit(output);
  const code = fs.readFileSync(workerPath, 'utf8');
  if (/sourceMappingURL|\brequire\s*\(|\bprocess\s*\.|\bBuffer\b|\bimport\s*\(/.test(code)) fail('unwanted Node runtime, dynamic import or source map in worker');
  const routing = readJSON(path.join(output, '_routes.json'));
  if (!same(routing, { version: 1, include: ['/api/*'], exclude: [] })) fail('Pages Function invocation surface changed');
  writeJSON(path.join(cwd, CACHE, 'runtime-result.json'), { verified: true, source, compilerModules: Object.fromEntries(graphs.map(graph => [graph.label, graph.moduleCount])), mappedSources, workerFiles: worker.files, installedPackages: installed.packageCount, exceptionAccepted: validation.accepted });
  console.log('Verified same-source compiler, exact native Fetch handlers, routes and deployed worker bytes.');
}

function recordNativeBuild(cwd, metafile, routePaths) {
  verifyApiSourceFiles(cwd);
  const run = readJSON(path.join(cwd, CACHE, 'build-run.json'));
  const source = sourceStamp(cwd);
  if (!same(run.source, source)) fail('source changed during native build');
  if (!isRecord(metafile) || !isRecord(metafile.inputs) || !isRecord(metafile.outputs)) fail('missing native metafile');
  const inputs = Object.keys(metafile.inputs).sort();
  validateNativeInputs(inputs);
  const tracked = new Set(execFileSync('git', ['ls-files', '-z'], { cwd, encoding: 'utf8' }).split('\0'));
  if (inputs.some(input => !tracked.has(input))) fail('untracked worker input outside source provenance');
  const outputs = Object.entries(metafile.outputs);
  if (outputs.length !== 1 || path.resolve(cwd, outputs[0][0]) !== path.join(cwd, '.vercel/output/static/_worker.js')) fail('unexpected native build output');
  const [output, metadata] = outputs[0];
  const record = {
    schemaVersion: 1, runId: run.id, source, generatedAt: new Date().toISOString(),
    output: '_worker.js', outputHash: hash(fs.readFileSync(path.resolve(cwd, output))), inputs,
    imports: [...new Set([...(metadata.imports || []).map(entry => entry.path), ...Object.values(metafile.inputs).flatMap(input => (input.imports || []).filter(entry => entry.external).map(entry => entry.path))])].sort(),
  };
  validateWorkerEvidence({ run, source, records: [record], files: [{ name: record.output, hash: record.outputHash }] });
  const routes = routePaths.map(name => ({ name, runtime: 'fetch', sourceRoot: '', sources: inputs }));
  validateNativeRoutes({ routes, workerExists: true });
  writeJSON(path.join(cwd, CACHE, 'worker-builds/native.json'), record);
  writeJSON(path.join(cwd, CACHE, 'native-routes.json'), routes);
  writeJSON(path.join(cwd, CACHE, 'native-worker-metafile.json'), metafile);
}

module.exports = { verifyPagesBuildContext, verifyApiSourceFiles, collectConsumerGraph, validateAudit, validateRuntimeEvidence, validateNativeRoutes, validateNativeInputs, validateWorkerEvidence, classifyRuntimeModule, sourceStamp, createRuntimeModulePlugin, recordNativeBuild, runAudit, prepare, verifyRuntime, parseJSONEvidence, isJavaScriptFile, verifyRetiredTooling };

if (require.main === module) {
  try {
    const command = process.argv[2];
    const commands = { audit: runAudit, prepare, verify: verifyRuntime };
    if (!Object.hasOwn(commands, command)) fail('expected audit, prepare, or verify');
    commands[command](process.cwd());
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
