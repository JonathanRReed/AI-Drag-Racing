import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';
import audit from './dependency-audit.cjs';

const { collectConsumerGraph, validateAudit, validateRuntimeEvidence, classifyRuntimeModule, validatePackagedFunctions, validateAdapterInputs, validateWorkerEvidence, parseJSONEvidence, isJavaScriptFile } = audit;
const expiry = '2027-10-18T05:00:00.000Z';
const beforeExpiry = new Date('2027-10-18T04:59:59.999Z');
const advisory = {
  id: 1240992,
  url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
  title: 'braces stack exhaustion',
  severity: 'high',
  vulnerable_versions: '<=3.0.3',
};
const report = { braces: [advisory] };
const lock = {
  workspaces: { '': { devDependencies: { adapter: '1.0.0' } } },
  packages: {
    adapter: ['adapter@1.0.0', '', { dependencies: { chokidar: '3.6.0' } }],
    chokidar: ['chokidar@3.6.0', '', { dependencies: { braces: '~3.0.2' } }],
    braces: ['braces@3.0.3', '', {}],
  },
};
const expectedGraph = {
  nodes: [
    ['adapter', 'adapter@1.0.0'],
    ['braces', 'braces@3.0.3'],
    ['chokidar', 'chokidar@3.6.0'],
  ],
  edges: [
    ['adapter', 'dependencies', 'chokidar', '3.6.0', 'chokidar'],
    ['chokidar', 'dependencies', 'braces', '~3.0.2', 'braces'],
    ['workspace:', 'devDependencies', 'adapter', '1.0.0', 'adapter'],
  ],
};
const policy = { expiresAt: expiry, consumerGraph: expectedGraph };
const request = (overrides = {}) => ({
  report, status: 1, lock, installedBracesVersion: '3.0.3', now: beforeExpiry, policy,
  ...overrides,
});
const source = { commit: 'a'.repeat(40), sourceHash: 'b'.repeat(64), lockHash: 'c'.repeat(64) };
const run = { id: 'synthetic-run', startedAt: '2026-10-11T03:00:00.000Z', source };
const graph = (label) => ({
  schemaVersion: 1, label, runId: run.id, source,
  generatedAt: '2026-10-11T03:01:00.000Z',
  moduleCount: 10, forbiddenModules: [],
  shadcnFiles: label === 'browser' ? ['dist/tailwind.css', 'package.json'] : [],
});
const runtimeRequest = (overrides = {}) => ({
  run, source, graphs: ['browser', 'edge', 'nodejs'].map(graph), now: new Date('2026-10-11T03:02:00.000Z'),
  ...overrides,
});

describe('the approved temporary braces audit exception', () => {
  it('retains valid JSON data without exposing malformed response text in an error', () => {
    expect(parseJSONEvidence(JSON.stringify(report))).toEqual(report);
    const malformed = 'synthetic-private-diagnostic';
    try {
      parseJSONEvidence(malformed);
      throw new Error('unexpected acceptance');
    } catch (error) {
      expect(error.message).toContain('malformed JSON');
      expect(error.message).not.toContain(malformed);
    }
  });
  it('accepts only the exact known residual and returns a visible expiring warning', () => {
    const result = validateAudit(request());
    expect(result.accepted).toBe(true);
    expect(result.warning).toContain('GHSA-vfj7-8cjw-p6xm');
    expect(result.warning).toContain('3.0.3');
    expect(result.warning).toContain(expiry);
    expect(result.warning).toContain('build');
  });

  it.each(['2027-10-18T05:00:00.000Z', '2027-10-18T05:00:00.001Z'])('blocks at or after expiry (%s)', (time) => {
    expect(() => validateAudit(request({ now: new Date(time) }))).toThrow(/expired/i);
  });

  it('does not need an exception for a clean successful audit after expiry', () => {
    expect(validateAudit(request({ report: {}, status: 0, now: new Date('2026-10-20T00:00:00Z') })).accepted).toBe(false);
  });

  it.each([
    { other: [{ ...advisory, url: 'https://github.com/advisories/GHSA-new-new-new' }] },
    { braces: [{ ...advisory, url: 'https://github.com/advisories/GHSA-new-new-new' }] },
    { braces: [advisory, { ...advisory, url: 'https://github.com/advisories/GHSA-new-new-new', severity: 'low' }] },
    { braces: [advisory], other: [{ ...advisory, severity: 'moderate' }] },
  ])('blocks every other package/advisory, including lower severities', (otherReport) => {
    expect(() => validateAudit(request({ report: otherReport }))).toThrow();
  });

  it.each([null, [], 'failed', { braces: [] }, { braces: [{}] }, { braces: [null] }, { braces: [{ ...advisory, severity: 'critical' }] }].map(value => [value]))('fails closed on unexpected report data (%j)', (otherReport) => {
    expect(() => validateAudit(request({ report: otherReport }))).toThrow();
  });

  it.each([null, 2, -1, 0])('rejects an unexpected process status for a vulnerable report (%s)', (status) => {
    expect(() => validateAudit(request({ status }))).toThrow();
  });

  it('rejects an audit request failure even if its output looks empty', () => {
    expect(() => validateAudit(request({ report: {}, status: 1 }))).toThrow();
  });

  it('blocks registry/process stderr even beside an otherwise accepted report', () => {
    expect(() => validateAudit(request({ stderr: 'registry request failed' }))).toThrow(/error output/i);
    expect(() => validateAudit(request({ report: {}, status: 0, stderr: 'registry request failed' }))).toThrow();
  });

  it.each(['3.0.2', '3.0.4', undefined])('does not accept another installed version (%s)', (installedBracesVersion) => {
    expect(() => validateAudit(request({ installedBracesVersion }))).toThrow(/version/i);
  });

  it('does not accept another locked version', () => {
    const changed = structuredClone(lock);
    changed.packages.braces[0] = 'braces@3.0.2';
    expect(() => validateAudit(request({ lock: changed }))).toThrow();
  });

  it('rejects a new direct or transitive consumer', () => {
    const changed = structuredClone(lock);
    changed.packages.newTool = ['newTool@1.0.0', '', { dependencies: { braces: '3.0.3' } }];
    expect(() => validateAudit(request({ lock: changed }))).toThrow(/consumer/i);
    const direct = structuredClone(lock);
    direct.workspaces[''].dependencies = { braces: '3.0.3' };
    expect(() => validateAudit(request({ lock: direct }))).toThrow(/consumer/i);
  });

  it('rejects a new alias to the vulnerable package', () => {
    const changed = structuredClone(lock);
    changed.packages.alias = ['braces@3.0.3', '', {}];
    expect(() => validateAudit(request({ lock: changed }))).toThrow();
  });

  it('collects exact dependency edges, including workspace/dev provenance', () => {
    expect(collectConsumerGraph(lock)).toEqual(expectedGraph);
  });

  it('resolves nested scoped packages without attributing an unrelated package version', () => {
    const changed = structuredClone(lock);
    changed.packages['@scope/tool'] = ['@scope/tool@1.0.0', '', { dependencies: { chokidar: '4.0.0' } }];
    changed.packages['@scope/tool/chokidar'] = ['chokidar@4.0.0', '', {}];
    expect(collectConsumerGraph(changed)).toEqual(expectedGraph);
  });

  it('rejects invalid dates rather than disabling expiry accidentally', () => {
    expect(() => validateAudit(request({ now: new Date('invalid') }))).toThrow();
  });
});

describe('fresh same-source runtime exclusion evidence', () => {
  it('leaves ordinary Next builds outside an audited Cloudflare run untouched', () => {
    const require = createRequire(import.meta.url);
    const config = require('../next.config.js');
    const observer = vi.spyOn(require('./dependency-audit.cjs'), 'createRuntimeModulePlugin').mockImplementation(() => { throw new Error('unexpected audit observer'); });
    vi.stubEnv('DEPENDENCY_AUDIT_RUN_ID', undefined);
    try {
      const webpack = { plugins: [] };
      expect(config.webpack(webpack, { isServer: false })).toBe(webpack);
      expect(webpack.plugins).toEqual([]);
    } finally {
      observer.mockRestore();
      vi.unstubAllEnvs();
    }
  });
  it('accepts browser, Edge and Node graphs with CSS-only shadcn provenance', () => {
    expect(validateRuntimeEvidence(runtimeRequest())).toEqual({ verified: true });
  });

  it.each(['browser', 'edge', 'nodejs'])('blocks a missing %s compilation', (label) => {
    expect(() => validateRuntimeEvidence(runtimeRequest({ graphs: ['browser', 'edge', 'nodejs'].filter(x => x !== label).map(graph) }))).toThrow();
  });

  it('blocks unknown, duplicate, empty and malformed compiler evidence', () => {
    for (const graphs of [[], null, [graph('browser'), graph('browser'), graph('edge')], [graph('browser'), graph('edge'), graph('other')]]) {
      expect(() => validateRuntimeEvidence(runtimeRequest({ graphs }))).toThrow();
    }
    const graphs = ['browser', 'edge', 'nodejs'].map(graph);
    graphs[0].moduleCount = 0;
    expect(() => validateRuntimeEvidence(runtimeRequest({ graphs }))).toThrow();
  });

  it('blocks a deliberate runtime dependency import', () => {
    const graphs = ['browser', 'edge', 'nodejs'].map(graph);
    graphs[0].forbiddenModules = ['braces'];
    expect(() => validateRuntimeEvidence(runtimeRequest({ graphs }))).toThrow(/runtime/i);
  });

  it.each(['commit', 'sourceHash', 'lockHash'])('blocks a stale %s stamp', (field) => {
    const graphs = ['browser', 'edge', 'nodejs'].map(graph);
    graphs[1].source = { ...source, [field]: 'stale' };
    expect(() => validateRuntimeEvidence(runtimeRequest({ graphs }))).toThrow();
  });

  it('blocks evidence from another run or from before build preparation', () => {
    const graphs = ['browser', 'edge', 'nodejs'].map(graph);
    graphs[0].runId = 'older-run';
    expect(() => validateRuntimeEvidence(runtimeRequest({ graphs }))).toThrow();
    graphs[0] = { ...graph('browser'), generatedAt: '2026-10-11T02:59:59.000Z' };
    expect(() => validateRuntimeEvidence(runtimeRequest({ graphs }))).toThrow();
  });

  it('requires shadcn CSS-only input and rejects CLI inputs', () => {
    const graphs = ['browser', 'edge', 'nodejs'].map(graph);
    graphs[0].shadcnFiles = ['package.json'];
    expect(() => validateRuntimeEvidence(runtimeRequest({ graphs }))).toThrow();
    graphs[0].shadcnFiles = ['dist/tailwind.css', 'dist/index.js'];
    expect(() => validateRuntimeEvidence(runtimeRequest({ graphs }))).toThrow();
  });

  it.each([
    '/project/node_modules/braces/lib/compile.js',
    '/project/node_modules/next/dist/compiled/micromatch/index.js',
    '/project/node_modules/fast-glob/out/index.js',
    '/project/node_modules/chokidar/index.js',
    '/project/node_modules/shadcn/dist/index.js',
    '/project/node_modules/@vercel/node/dist/index.js',
    'external node-commonjs "@next/eslint-plugin-next"',
    'external node-commonjs "eslint-config-next"',
    '/project/node_modules/@cloudflare/next-on-pages/dist/index.js',
    'external node-commonjs "braces"',
  ])('recognizes bundled and external execution-chain modules (%s)', (identifier) => {
    expect(classifyRuntimeModule({ identifier, resource: null }).length).toBeGreaterThan(0);
  });

  it('permits the intended stylesheet and unrelated app code', () => {
    expect(classifyRuntimeModule({ identifier: '/project/styles/globals.css', resource: '/project/styles/globals.css' })).toEqual([]);
    expect(classifyRuntimeModule({ identifier: '/project/node_modules/shadcn/dist/tailwind.css', resource: '/project/node_modules/shadcn/dist/tailwind.css' })).toEqual([]);
    expect(classifyRuntimeModule({ identifier: 'node_modules/@cloudflare/next-on-pages/templates/_worker.js/index.ts' })).toEqual([]);
    expect(classifyRuntimeModule({ identifier: 'node_modules/@cloudflare/next-on-pages/templates/cache/adaptor.ts' })).toEqual([]);
  });
});

describe('the deployed Cloudflare request surface', () => {
  const packaged = () => ['api/bedrock-models.func', 'api/models.func', 'api/providers/[providerId]/completions.func'].map(name => ({
    name, runtime: 'edge', sources: ['webpack://app/./utils/providers.ts'], sourceRoot: '',
  }));

  it('requires the three reviewed Edge functions and the worker artifact', () => {
    expect(validatePackagedFunctions({ functions: packaged(), workerExists: true })).toEqual({ mappedSources: 3 });
  });

  it('blocks a new function, missing function, non-Edge runtime or missing worker', () => {
    for (const functions of [packaged().slice(1), [...packaged(), { name: 'api/new.func', runtime: 'nodejs', sources: ['app.ts'] }], packaged().map(fn => ({ ...fn, runtime: 'nodejs' }))]) {
      expect(() => validatePackagedFunctions({ functions, workerExists: true })).toThrow();
    }
    expect(() => validatePackagedFunctions({ functions: packaged(), workerExists: false })).toThrow();
  });

  it('blocks missing, malformed or forbidden packaged source maps', () => {
    for (const sources of [[], null, [null], ['webpack://app/./node_modules/braces/index.js']]) {
      const functions = packaged();
      functions[0].sources = sources;
      expect(() => validatePackagedFunctions({ functions, workerExists: true })).toThrow();
    }
    const functions = packaged();
    functions[0].sourceRoot = '/node_modules/braces/';
    expect(() => validatePackagedFunctions({ functions, workerExists: true })).toThrow();
  });
});

describe('the adapter worker scaffold', () => {
  it('accepts the separately bundled worker/cache scaffold without execution-chain inputs', () => {
    expect(validateAdapterInputs([
      'node_modules/@cloudflare/next-on-pages/templates/_worker.js/index.ts',
      'node_modules/@cloudflare/next-on-pages/templates/cache/adaptor.ts',
      'node_modules/cookie/index.js',
    ])).toEqual({ inputCount: 3 });
  });

  it.each([[], null, [null], ['node_modules/braces/index.js'], ['node_modules/@cloudflare/next-on-pages/templates/_worker.js/index.ts', 'node_modules/micromatch/index.js']].map(value => [value]))('blocks missing, malformed or forbidden scaffold inputs (%j)', (inputs) => {
    expect(() => validateAdapterInputs(inputs)).toThrow();
  });
});

describe('actual bundled worker and helper coverage', () => {
  it.each(['index.js', 'helper.mjs', 'nested/helper.cjs'])('requires all runtime JavaScript extensions (%s)', (file) => {
    expect(isJavaScriptFile(file)).toBe(true);
  });

  it.each(['index.js.map', 'nop-build-log.json', 'helper.wasm'])('does not mistake data/maps for JavaScript (%s)', (file) => {
    expect(isJavaScriptFile(file)).toBe(false);
  });
  const record = (file = 'index.js') => ({
    schemaVersion: 1, runId: run.id, source,
    generatedAt: '2026-10-11T03:01:00.000Z',
    output: file, outputHash: 'd'.repeat(64),
    inputs: ['node_modules/@cloudflare/next-on-pages/templates/_worker.js/index.ts', 'node_modules/cookie/index.js'],
    imports: ['node:async_hooks'],
  });
  const workerRequest = (overrides = {}) => ({
    run, source, records: [record()],
    files: [{ name: 'index.js', hash: 'd'.repeat(64) }],
    now: new Date('2026-10-11T03:02:00.000Z'), ...overrides,
  });

  it('covers the exact generated worker bytes and every helper with actual build metadata', () => {
    const records = [record(), record('__next-on-pages-dist__/cache/adaptor.js')];
    const files = records.map(x => ({ name: x.output, hash: x.outputHash }));
    expect(validateWorkerEvidence(workerRequest({ records, files }))).toEqual({ verified: true, files: 2 });
  });

  it('blocks missing worker/helper metadata and extra uncovered runtime JavaScript', () => {
    expect(() => validateWorkerEvidence(workerRequest({ records: [] }))).toThrow();
    expect(() => validateWorkerEvidence(workerRequest({ files: [...workerRequest().files, { name: 'helper.js', hash: 'd'.repeat(64) }] }))).toThrow();
  });

  it('blocks forbidden helper inputs or external runtime imports', () => {
    for (const changed of [
      { ...record('helper.js'), inputs: ['node_modules/braces/index.js'] },
      { ...record('helper.js'), imports: ['braces'] },
    ]) {
      expect(() => validateWorkerEvidence(workerRequest({ records: [record(), changed], files: [...workerRequest().files, { name: 'helper.js', hash: changed.outputHash }] }))).toThrow();
    }
  });

  it.each(['helper.mjs', 'helper.cjs'])('blocks an uncovered or forbidden %s helper', (file) => {
    expect(() => validateWorkerEvidence(workerRequest({ files: [...workerRequest().files, { name: file, hash: 'd'.repeat(64) }] }))).toThrow();
    const forbidden = { ...record(file), inputs: ['node_modules/braces/index.js'] };
    expect(() => validateWorkerEvidence(workerRequest({ records: [record(), forbidden], files: [...workerRequest().files, { name: file, hash: forbidden.outputHash }] }))).toThrow();
  });

  it('blocks changed output bytes, stale records, missing worker and duplicate output records', () => {
    for (const overrides of [
      { files: [{ name: 'index.js', hash: 'changed' }] },
      { records: [{ ...record(), runId: 'older-run' }] },
      { records: [{ ...record(), source: { ...source, commit: 'older-head' } }] },
      { records: [{ ...record(), generatedAt: '2026-10-11T02:59:59Z' }] },
      { files: [] },
      { records: [record(), record()] },
    ]) expect(() => validateWorkerEvidence(workerRequest(overrides))).toThrow();
  });
});
