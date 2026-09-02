import { createRequire } from 'node:module';
import { realpathSync } from 'node:fs';

export function assertSharedReact(entries) {
  const appReact = entries[0]?.path;
  if (!appReact || entries.some(entry => entry.path !== appReact)) {
    throw new Error('Release blocked: multiple React runtimes were resolved. Reinstall the locked dependencies in a clean node_modules directory before building.');
  }
  return entries;
}

export function verifyReactRuntime() {
  const require = createRequire(import.meta.url);
  const entries = ['react', 'react-dom', 'react-chartjs-2'].map(name => {
    const dependencyRequire = createRequire(require.resolve(name));
    return { name, path: realpathSync(dependencyRequire.resolve('react')) };
  });
  return assertSharedReact(entries);
}

if (import.meta.main) {
  console.log('Verified one React runtime for:', verifyReactRuntime().map(entry => entry.name).join(', '));
}
