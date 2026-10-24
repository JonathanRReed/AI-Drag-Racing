import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import audit from './dependency-audit.cjs';

const require = createRequire(import.meta.url);
const cwd = process.cwd();
const configPath = require.resolve('../next.config.js');
const preparationPath = path.join(cwd, '.cache/dependency-audit/build-run.json');
const nativeEnv = { CF_PAGES: '1', PAGES_BUILD: '1', DEPENDENCY_AUDIT_RUN_ID: 'bounded-native-fixture' };

function loadConfig(env) {
  for (const name of ['CF_PAGES', 'CF_PAGES_BRANCH', 'PAGES_BUILD', 'DEPENDENCY_AUDIT_RUN_ID']) vi.stubEnv(name, env[name]);
  delete require.cache[configPath];
  return require(configPath);
}
function mockPreparation(transform = run => run) {
  const run = transform({ id: nativeEnv.DEPENDENCY_AUDIT_RUN_ID, source: audit.sourceStamp(cwd) });
  const read = fs.readFileSync;
  vi.spyOn(fs, 'readFileSync').mockImplementation((file, ...args) => String(file) === preparationPath ? JSON.stringify(run) : read(file, ...args));
  return run;
}
afterEach(() => {
  delete require.cache[configPath];
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('Cloudflare Pages cannot silently take an ordinary Next build path', () => {
  it.each(['main', 'bounded-preview', undefined])('rejects ordinary Next commands on Pages branch %s before compilation', branch => {
    expect(() => loadConfig({ CF_PAGES: '1', CF_PAGES_BRANCH: branch })).toThrow(/build:pages/);
  });
  it.each([
    { CF_PAGES: '1', PAGES_BUILD: '1' },
    { CF_PAGES: '1', DEPENDENCY_AUDIT_RUN_ID: 'bounded-native-fixture' },
    { ...nativeEnv, PAGES_BUILD: '0' },
    { ...nativeEnv, DEPENDENCY_AUDIT_RUN_ID: '' },
  ])('rejects an incomplete or misleading native invocation (%j)', env => {
    mockPreparation();
    expect(() => loadConfig(env)).toThrow(/build:pages/);
  });
  it('rejects absent preparation even if both flags are supplied', () => {
    const read = fs.readFileSync;
    vi.spyOn(fs, 'readFileSync').mockImplementation((file, ...args) => {
      if (String(file) === preparationPath) throw new Error('bounded missing preparation');
      return read(file, ...args);
    });
    expect(() => loadConfig(nativeEnv)).toThrow(/build:pages/);
  });
  it('rejects preparation from a different run', () => {
    mockPreparation(run => ({ ...run, id: 'older-run' }));
    expect(() => loadConfig(nativeEnv)).toThrow(/build:pages/);
  });
  it.each(['commit', 'sourceHash', 'lockHash'])('rejects preparation with changed %s', field => {
    mockPreparation(run => ({ ...run, source: { ...run.source, [field]: 'stale' } }));
    expect(() => loadConfig(nativeEnv)).toThrow(/build:pages/);
  });
  it('accepts only the matching source-bound native build context on Pages', () => {
    mockPreparation();
    expect(loadConfig(nativeEnv).output).toBe('export');
  });
  it.each([{}, { CF_PAGES: '0' }, { PAGES_BUILD: '1' }])('preserves ordinary local Next configuration (%j)', env => {
    const config = loadConfig(env);
    expect(config.output).toBe(env.PAGES_BUILD === '1' ? 'export' : undefined);
  });
});
