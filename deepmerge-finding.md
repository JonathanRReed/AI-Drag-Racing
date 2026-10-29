# deepmerge reachability (GHSA-gcqx-w48m-w2h4)

Base: `08717f36a60d3b7932a5e9697b12606b901ec07c` plus this PR's shadcn ^4.23.0 / qs / systeminformation overrides (no deepmerge pin).

## Who depends on deepmerge

Measured with `bun pm why deepmerge` after the shadcn bump:

- `shadcn@4.23.0` → `deepmerge@4.3.1` (direct)
- `shadcn@4.23.0` → `@shadcn/registry@0.2.1` → `deepmerge@4.3.1`

App source under `pages/`, `components/`, `lib/`, `utils/`, `worker/` has **zero** imports of `deepmerge` or of the `shadcn` JS package. The only app reference is CSS:

- `styles/globals.css`: `@import "shadcn/tailwind.css";`

## Where deepmerge runs

In `shadcn` / `@shadcn/registry` it is imported as a CLI/devtime helper for merging Tailwind config objects and registry config (e.g. `import K from'deepmerge'` in registry Tailwind-config updater; `import U from'deepmerge'` in config resolution; `import Io from'deepmerge'` in the shadcn CLI `dist/index.js`). Those call sites merge **local project config / registry metadata**, not request bodies from end users.

The vulnerable operation in GHSA-gcqx-w48m-w2h4 is `mergeObject()` accepting attacker-controlled source objects (prototype poisoning of the **returned** object via `__proto__`). Reachability therefore requires:

1. Executing the shadcn CLI or registry updater code paths, and
2. Feeding them untrusted merge inputs.

This app does not invoke the shadcn CLI in `package.json` scripts, Next pages, API routes, or the Cloudflare worker. `scripts/dependency-audit.cjs` lists `shadcn` in `FORBIDDEN` for runtime compilation and only allows `dist/tailwind.css` / `package.json` as shadcn inputs in build evidence.

## Does it ship in the build output?

After `bun run build` (Next 15.5.28 production build), a content search of `.next/**/*.js` and `.next/**/*.map` for `deepmerge`, `propertyIsUnsafe`, and `cloneUnlessOtherwiseSpecified` returned **no hits**. The CSS-only import does not pull the deepmerge module into client or server bundles.

## Audit gate

`bun audit` and `bun run audit:dependencies` still report **only** `deepmerge@4.3.1` / GHSA-gcqx-w48m-w2h4. That is the exact remaining blocker for a green `verify` workflow. No patched npm release exists (`first_patched_version: null`, latest still 4.3.1). This PR does **not** add a fork pin or an audit exception.

## Conclusion

- **Runtime / shipped app:** deepmerge is not reachable; not present in `.next` output. Risk to end users of this site is not demonstrated.
- **Install / CLI / local tooling:** deepmerge remains a transitive of the shadcn package used for CSS. Anyone running `npx shadcn` against untrusted registry payloads could still exercise the vuln; that is outside this app's production path.
- **CI:** `Audit dependencies` will stay red until upstream publishes a fixed deepmerge or the shadcn tree drops it. Track that as the exact blocker; do not weaken the gate here.
