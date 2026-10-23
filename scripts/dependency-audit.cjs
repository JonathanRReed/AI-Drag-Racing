const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync, spawnSync } = require('node:child_process');

const ADVISORY = 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm';
const EXPIRES_AT = '2027-10-18T05:00:00.000Z';
const FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
const CACHE = '.cache/dependency-audit';
const GRAPH_DIR = '.next/dependency-audit';
const LABELS = ['browser', 'edge', 'nodejs'];
const FORBIDDEN = ['braces', 'micromatch', 'fast-glob', 'chokidar', 'shadcn', 'ts-morph', '@ts-morph/common', '@next/eslint-plugin-next', 'eslint-config-next', '@cloudflare/next-on-pages', 'vercel', '@vercel/express', '@vercel/hono', '@vercel/hydrogen', '@vercel/node', '@vercel/redwood', '@vercel/remix-builder', '@vercel/static-build', '@vercel/static-config'];
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
    // The adapter's reviewed request-routing/cache templates are deployed; its
    // CLI/build modules and their glob consumers must remain excluded.
    if (name === '@cloudflare/next-on-pages' && /\/@cloudflare\/next-on-pages\/templates\/(?:_worker\.js|cache)\//.test(value)) return false;
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

function validatePackagedFunctions({ functions, workerExists }) {
  const expected = ['api/bedrock-models.func', 'api/models.func', 'api/providers/[providerId]/completions.func'].sort();
  if (!Array.isArray(functions) || !same(functions.map(fn => fn?.name).sort(), expected) || workerExists !== true) fail('packaged function set or worker changed; review runtime reachability');
  let mappedSources = 0;
  for (const fn of functions) {
    if (fn.runtime !== 'edge' || !Array.isArray(fn.sources) || !fn.sources.length || typeof fn.sourceRoot !== 'string') fail('invalid packaged Edge function evidence');
    for (const identifier of fn.sources) {
      if (typeof identifier !== 'string' || classifyRuntimeModule({ identifier: `${fn.sourceRoot}/${identifier}` }).length) fail('invalid or forbidden dependency in packaged Edge function');
    }
    mappedSources += fn.sources.length;
  }
  return { mappedSources };
}

function validateAdapterInputs(inputs) {
  if (!Array.isArray(inputs) || !inputs.length || inputs.some(input => typeof input !== 'string' || classifyRuntimeModule({ identifier: input }).length)) fail('invalid or forbidden adapter runtime input');
  if (!inputs.some(input => input.replace(/\\/g, '/').includes('/@cloudflare/next-on-pages/templates/_worker.js/index.ts'))) fail('missing actual adapter worker input');
  return { inputCount: inputs.length };
}

function validateWorkerEvidence({ run, source, records, files, now = new Date() }) {
  if (!isRecord(run) || !same(run.source, source) || !Array.isArray(records) || !records.length || !Array.isArray(files) || !files.some(file => file?.name === 'index.js')) fail('missing worker/helper build metadata');
  const outputs = new Set();
  const allInputs = new Set();
  for (const record of records) {
    const generated = Date.parse(record?.generatedAt);
    if (!isRecord(record) || record.schemaVersion !== 1 || record.runId !== run.id || !same(record.source, source) || typeof record.output !== 'string' || outputs.has(record.output) || !/^[a-f0-9]{64}$/.test(record.outputHash) || !Number.isFinite(generated) || generated < Date.parse(run.startedAt) || generated > now.getTime()) fail('stale or malformed worker build metadata');
    if (!Array.isArray(record.inputs) || !record.inputs.length || !Array.isArray(record.imports) || [...record.inputs, ...record.imports].some(input => typeof input !== 'string' || classifyRuntimeModule({ identifier: input }).length)) fail('forbidden worker/helper runtime dependency');
    outputs.add(record.output);
    for (const input of record.inputs) allInputs.add(input);
  }
  validateAdapterInputs([...allInputs]);
  for (const file of files) {
    if (!isRecord(file) || typeof file.name !== 'string' || !/^[a-f0-9]{64}$/.test(file.hash) || !records.some(record => record.output === file.name && record.outputHash === file.hash)) fail('uncovered or changed worker/helper JavaScript');
  }
  return { verified: true, files: files.length };
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
  const metadata = readJSON(path.join(cwd, CACHE, 'result.json'));
  if (metadata.processFailed !== false) fail('audit process did not complete');
  if (!same(metadata.source, sourceStamp(cwd))) fail('audit evidence belongs to another source tree');
  const report = readJSON(path.join(cwd, CACHE, 'report.json'));
  const installed = Object.hasOwn(report, 'braces') ? readJSON(path.join(cwd, 'node_modules/braces/package.json')).version : undefined;
  const stderr = fs.readFileSync(path.join(cwd, CACHE, 'process-stderr.txt'), 'utf8');
  return validateAudit({ report, status: metadata.status, stderr, lock: readLock(cwd), installedBracesVersion: installed, now, policy: loadPolicy(cwd) });
}

function warn(message) {
  if (!message) return;
  console.warn(`::warning title=Temporary braces exception::${message}`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\nWarning: ${message}\n`);
}

function runAudit(cwd) {
  const result = spawnSync(process.execPath, ['audit', '--json'], { cwd, encoding: 'utf8', timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
  if (result.error || result.signal) fail('audit process did not complete');
  let report = parseJSONEvidence(result.stdout);
  if (isRecord(report) && Object.hasOwn(report, 'braces')) {
    report = { braces: report.braces };
  }
  const reportFile = path.join(cwd, CACHE, 'report.json');
  fs.mkdirSync(path.dirname(reportFile), { recursive: true });
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(cwd, CACHE, 'process-stderr.txt'), result.stderr || '');
  writeJSON(path.join(cwd, CACHE, 'result.json'), { status: result.status, processFailed: !!(result.error || result.signal), source: sourceStamp(cwd), capturedAt: new Date().toISOString() });
  console.log(JSON.stringify(report, null, 2));
  const validation = validateCurrentAudit(cwd);
  warn(validation.warning);
  if (!validation.accepted) console.log('Dependency audit: no vulnerabilities reported.');
}

function prepare(cwd) {
  const validation = validateCurrentAudit(cwd);
  warn(validation.warning);
  fs.rmSync(path.join(cwd, GRAPH_DIR), { recursive: true, force: true });
  fs.rmSync(path.join(cwd, CACHE, 'worker-builds'), { recursive: true, force: true });
  writeJSON(path.join(cwd, CACHE, 'build-run.json'), { id: crypto.randomUUID(), startedAt: new Date().toISOString(), source: sourceStamp(cwd) });
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
        const visitCompilation = current => {
          const visitModule = module => {
            if (seen.has(module)) return;
            seen.add(module);
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
          forbiddenModules: [...forbidden].sort(), shadcnFiles: [...shadcnFiles].sort(),
        });
      });
    },
  };
}

function verifyRuntime(cwd) {
  const validation = validateCurrentAudit(cwd);
  warn(validation.warning);
  const run = readJSON(path.join(cwd, CACHE, 'build-run.json'));
  const graphs = LABELS.map(label => readJSON(path.join(cwd, GRAPH_DIR, `${label}.json`)));
  const source = sourceStamp(cwd);
  validateRuntimeEvidence({ run, source, graphs });
  // These functions are the deployed API input surface, not build-tool processes.
  const functions = [];
  const visitFunctions = (folder, relative = '') => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      if (entry.isDirectory()) visitFunctions(path.join(folder, entry.name), path.posix.join(relative, entry.name));
      else if (entry.name === '.vc-config.json') {
        const map = readJSON(path.join(folder, 'index.js.map'));
        functions.push({ name: relative, runtime: readJSON(path.join(folder, entry.name)).runtime, sources: map.sources, sourceRoot: map.sourceRoot || '' });
      }
    }
  };
  visitFunctions(path.join(cwd, '.vercel/output/functions'));
  const { mappedSources } = validatePackagedFunctions({ functions, workerExists: fs.existsSync(path.join(cwd, '.vercel/output/static/_worker.js/index.js')) });
  const recordsDir = path.join(cwd, CACHE, 'worker-builds');
  const records = fs.readdirSync(recordsDir).map(file => readJSON(path.join(recordsDir, file)));
  const files = [];
  const visitWorker = (folder, relative = '') => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const name = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) visitWorker(path.join(folder, entry.name), name);
      else if (entry.isSymbolicLink()) fail('unexpected worker artifact symlink');
      else if (isJavaScriptFile(entry.name)) files.push({ name, hash: hash(fs.readFileSync(path.join(folder, entry.name))) });
    }
  };
  visitWorker(path.join(cwd, '.vercel/output/static/_worker.js'));
  const worker = validateWorkerEvidence({ run, source, records, files });
  writeJSON(path.join(cwd, CACHE, 'runtime-result.json'), { verified: true, source, compilerModules: Object.fromEntries(graphs.map(graph => [graph.label, graph.moduleCount])), mappedSources, workerFiles: worker.files, exceptionAccepted: validation.accepted });
  console.log('Verified same-source compiler, packaged Edge functions and every deployed worker/helper JavaScript file.');
}

function recordAdapterBuild(cwd, metafile) {
  const run = readJSON(path.join(cwd, CACHE, 'build-run.json'));
  const source = sourceStamp(cwd);
  if (!same(run.source, source)) fail('source changed during adapter build');
  if (!isRecord(metafile) || !isRecord(metafile.inputs) || !isRecord(metafile.outputs)) fail('missing adapter metafile');
  const outputRoot = path.join(cwd, '.vercel/output');
  const workerRoot = path.join(outputRoot, 'static/_worker.js');
  const inputs = Object.keys(metafile.inputs).sort();
  for (const [output, metadata] of Object.entries(metafile.outputs)) {
    const absolute = path.resolve(cwd, output);
    const relative = path.relative(outputRoot, absolute);
    if (relative.startsWith('..') || path.isAbsolute(relative) || !isJavaScriptFile(relative)) continue;
    const workerRelative = path.relative(workerRoot, absolute);
    const key = workerRelative.startsWith('..') ? `prepackage:${relative}` : workerRelative;
    writeJSON(path.join(cwd, CACHE, 'worker-builds', `${hash(key)}.json`), {
      schemaVersion: 1, runId: run.id, source, generatedAt: new Date().toISOString(),
      output: key.replace(/\\/g, '/'), outputHash: hash(fs.readFileSync(absolute)),
      inputs,
      imports: [...new Set([
        ...(metadata.imports || []).map(entry => entry.path),
        ...Object.values(metafile.inputs).flatMap(input => (input.imports || []).filter(entry => entry.external).map(entry => entry.path)),
      ])].sort(),
    });
  }
}

module.exports = { collectConsumerGraph, validateAudit, validateRuntimeEvidence, validatePackagedFunctions, validateAdapterInputs, validateWorkerEvidence, classifyRuntimeModule, sourceStamp, createRuntimeModulePlugin, recordAdapterBuild, runAudit, prepare, verifyRuntime, parseJSONEvidence, isJavaScriptFile };

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
