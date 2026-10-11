// Preload only into the normal next-on-pages process. Add esbuild's documented
// metafile option to its actual builds; never rewrite generated code or options.
const Module = require('node:module');
const fs = require('node:fs');
const path = require('node:path');
const { recordAdapterBuild } = require('./dependency-audit.cjs');
const run = JSON.parse(fs.readFileSync(path.join(process.cwd(), '.cache/dependency-audit/build-run.json'), 'utf8'));
process.env.DEPENDENCY_AUDIT_RUN_ID = run.id;
const originalLoad = Module._load;
const wrapped = new WeakMap();

Module._load = function(request, parent, isMain) {
  const exports = originalLoad.call(this, request, parent, isMain);
  if (request !== 'esbuild') return exports;
  if (!wrapped.has(exports)) {
    wrapped.set(exports, new Proxy(exports, {
      get(target, property, receiver) {
        if (property !== 'build') return Reflect.get(target, property, receiver);
        return async options => {
          const result = await target.build({ ...options, metafile: true });
          recordAdapterBuild(process.cwd(), result.metafile);
          return result;
        };
      },
    }));
  }
  return wrapped.get(exports);
};
