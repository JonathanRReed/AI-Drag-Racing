# Dependency audit policy and history

## Native Pages build candidate

The retired next-on-pages/Vercel/Wrangler/Miniflare toolchain is no longer installed.
The existing expiration and exact historical consumer snapshot below are unchanged.
Both full and production audits run unfiltered and must pass. A clean registry
audit is not a claim about code bundled inside other packages. See
[native Pages verification and limits](native-pages.md).

## October 23, 2026 advisory withdrawal

GitHub withdrew [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
on October 23 because it was not practically exploitable. A fresh unfiltered
full audit of this branch returns an empty report; the production audit also
reports no findings. No exception was extended and no findings were filtered.
The existing fail-closed audit and packaging controls remain enforced. Release
still requires the complete application and Cloudflare packaging gates.

The sections below preserve the historical exception and its original expired
deadline: **2026-10-18 at 05:00 UTC**. No automatic extension.

## Historical October 22, 2026 maintenance status

The original deadline remains expired. The unrelated extension to October 2027
has been removed; there is no renewed exception. Next.js and its ESLint config
are updated to 15.5.28, and ip-address is pinned to its patched 10.7.4 release.
The fresh unfiltered audit now reports only the braces finding below, and the
policy correctly blocks it. A successful ordinary Next build is not a passing
Cloudflare packaging gate. Do not merge or deploy until the remaining dependency
is remediated and the complete gate passes.

The dependency audit still checks every installed dependency and every severity.
It temporarily accepts only [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
for exact braces 3.0.3. The advisory has no published patched release as of
2026-10-11. Deeply nested patterns can exhaust a build/developer process's stack;
the package's character limit does not prevent this.

The approved consumers are recorded as exact resolved lockfile nodes and edges
in `scripts/braces-exception-consumers.json`: next-on-pages/chokidar, Next ESLint,
shadcn's CLI/ts-morph graph, and Vercel's builder/ts-morph graph. A version, alias,
range, consumer or dependency-type change requires review. Shadcn is listed in
production dependencies because its `tailwind.css` stylesheet is used. Its CLI
JavaScript and glob dependencies are not deployed by this application.

## Required controls

- `bun run audit:dependencies` runs unfiltered `bun audit --json`. The full report
  is printed and retained with the source identity. All other/new findings,
  unexpected process statuses, malformed reports and registry failures block.
  Process stderr is retained separately and any nonempty stderr fails closed.
- The exact residual emits a visible CI warning and summary with its expiry and
  build-only availability risk. This is an accepted residual, not a clean audit.
- Cloudflare build scripts perform a fresh audit, clear prior compiler evidence,
  and prepare a unique build run tied to the Git commit, tracked-source digest and
  lockfile digest.
- A local webpack observer checks all browser, Edge and Node compilation modules,
  including concatenated children, child compilations and external identifiers.
  It stores counts and forbidden-package names, without source contents or
  environment values. Shadcn file inputs must be CSS/package metadata only.
  It is enabled only inside the prepared Cloudflare build process; ordinary
  Next builds/dev sessions do not use a leftover audit cache.
- Packaging verification requires fresh matching browser, Edge and Node compiler
  records and unchanged source/lock identity. Actual esbuild metafiles must contain
  the application-owned router and exactly the three reviewed Fetch handler files,
  with no package or external runtime imports. The exported route descriptors are
  read from the real emitted bundle; missing/new handlers fail closed.
- Exactly one `_worker.js` file is supported. Its bytes must match fresh build
  metadata; helpers, external imports, Node shims and source maps are rejected.
  `_routes.json` must invoke Functions only for `/api/*`. Both the lock graph and
  fresh installed package tree must omit the retired adapter/deployment toolchain.
  Audit and runtime evidence remain retained as CI artifacts.
- Existing lint, typecheck, test and production-build gates remain required.

Run `bun run audit:dependencies` for the policy-aware audit. Before the
October 23 withdrawal, plain `bun audit` reported the known high finding and
returned a failing status; the current unfiltered result is recorded above.

At expiry the residual fails again. A clean successful audit does not need an
exception, including after expiry. Remove this policy when a patched package or
verified toolchain replacement resolves the advisory; do not change its date or
consumer snapshot to accommodate an unrelated dependency update.

Historically the Pages adapter required Vercel to produce its build artifact.
The native Pages candidate explicitly replaces that build/routing responsibility;
it is not a declaration that the former dependency chain was unused.
