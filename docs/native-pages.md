# Native Cloudflare Pages build contract

This is an application-owned build simplification, not a Next/React framework
upgrade. Next remains 15.5.28, and the UI, original API handlers and share page
remain in place. No Cloudflare settings, credentials, DNS or plan are changed.
Live Git integration and Free-plan settings still require independent review.

## Build and supported deployment

Run `bun install --frozen-lockfile`, then `bun run build:pages`. The existing
Cloudflare Pages Git build command and `.vercel/output/static` output path stay
unchanged. The existing wrangler.toml project name, compatibility date/flags,
output directory and public Supabase URL are retained. The production main-branch
Supabase build guard still rejects absent or inappropriate anonymous credentials.

The build runs both unfiltered audits, prepares source-bound evidence, verifies
one React runtime and invokes Next's Pages Router static exporter. Next generates
HTML, CSS and browser JavaScript, including the existing `/share/[id]` shell.
It does not export API handlers. Official esbuild 0.28.2 bundles the three existing
Fetch handlers separately into `_worker.js`, with no Next/server/Node runtime.

The advanced-mode worker handles only `/api/*`; all other routes are excluded by
`_routes.json` and also have an original-Request `env.ASSETS.fetch` fallback.
The output includes the original security headers and share rewrite, plus the
immutable `/_next/static/*` cache rule formerly emitted by the adapter. Unknown
API requests retain the exported HTML 404 path and status, not SPA fallback.

Removed: next-on-pages, its Vercel build chain, Wrangler/Miniflare, the adapter
preload, legacy `build:cf`/`postbuild:cf`, and `deploy:cf`. The manual CLI deployment
capability is intentionally retired, not moved behind npx, bunx, a global install
or an unaudited script. Existing Pages Git deployment is the supported path.
`bun run dev`, ordinary `bun run build`, and `bun run start` still use Next locally.
No CLI preview of the native Cloudflare runtime is claimed as a replacement.

## Compatibility boundaries

- The outer `/api` prefix is case-sensitive. Bare `/api` follows the unknown-API
  404 path because the existing Pages `/api/*` rule includes it. `/API` or `/Api`
  use the asset service instead (normally GET 404, non-GET asset semantics).
  This follows the installed former Wrangler Pages dev matcher and pipeline;
  it is source-based compatibility evidence, not a hosted case-routing probe.
- Fixed API paths are exact and case-sensitive. The dynamic completion matcher
  retains the old adapter's case-insensitive shape; the original handler's own
  provider extraction remains case-sensitive. Paths are not manually decoded.
- The three handlers retain POST, OPTIONS, origin/body bounds, credential
  redaction and error behavior. HEAD runs the same handler but has no body.
- A single valid trailing slash gets the prior 308 canonicalization. Duplicate
  slashes and extra path segments do not become valid endpoints.
- Requests reach handlers unchanged, preserving the original body, signal and
  Cloudflare cf metadata, which the former Vercel edge launcher reconstructed
  without copying signal/cf. This intentionally restores that metadata rather
  than claiming identical old-wrapper behavior. SSE bodies are never buffered, cloned or teed by routing.
- `/share/* /share/[id] 200` and the ASO shell metadata preserve client-side ID
  resolution on direct entry. This does not introduce SSR, ISR or server data
  routes. Adding those capabilities requires a new architecture review.

## Evidence and limits

Existing tests, strict audit policy, compiler provenance and CSS-only shadcn
provenance remain required. Native tests execute the actual generated bundle
with bounded provider fixtures, check incremental UTF-8/SSE/error behavior,
original-request cancellation forwarding, routes, asset fallback and headers.
The build gate also checks the complete source API-file set so an unimported
fourth handler cannot silently disappear during static export. Source API
symlinks or missing files fail before compilation and again before verification.
The build gate requires exact native inputs/route set, no external runtime
imports, fresh source/run stamps and hashes of the exact emitted worker bytes.
No retired package may remain in the lock graph or installed package tree.

These tests are not native Cloudflare runtime/CPU measurements, and they do not
prove Cloudflare always emits a disconnect signal. The architecture-only revision left existing completion-handler lifetime
limitations visible; the separate cancellation follow-up described below repairs
them rather than hiding them inside the architecture change. No real provider inference is used.
Hosted browser acceptance must still cover direct share entry and hard refresh,
query/hash IDs, home/share Back/Forward and all five slider focus indicators.
No standalone browser executable is part of this verification.

## Vendor-bundled dependency limit

Next 15.5.28 retains its vendor-compiled Zod. The official release source pins
Zod 3.25.76 and `ncc_zod` bundles it into `next/dist/compiled/zod/index.cjs`.
The installed file SHA-256 is
`9b5ddc6cc0aa15c059069c452e4311d4732565d4c28173868c8d661723e52ab4`.
That version falls below the fixed 4.6.6 range in GHSA-mrhx-c7xc-m3w5 and is not
visible to a dependency-graph-only audit. No override or source patch is applied.

Inspected references are Next configuration/segment validation and devtools.
The build parses repository-controlled configuration, rather than user API
request bodies. Local Next development/server modes still contain the vendor
bundle. The native deployed worker has no Next or package inputs at all, and
only exported browser assets are copied, never Next's server/build modules.
Compiler provenance also rejects Zod modules (including the vendored Next path)
and records every Next vendor-module input for browser/Edge/Node graph review.
A supplementary exported-JavaScript scan is not treated as absence proof alone.
Removal of obsolete adapter packages is therefore not a claim that every
vendor-bundled vulnerability in the development installation has been remediated.

Source: [Next 15.5.28 package manifest](https://github.com/vercel/next.js/blob/v15.5.28/packages/next/package.json)
and [vendor bundling task](https://github.com/vercel/next.js/blob/v15.5.28/packages/next/taskfile.js).

## Separate stream-lifetime follow-up

The native router still forwards the original Request. The completion handler
now owns a per-stream AbortController so either incoming Request abort or
response-reader cancellation stops cooperative provider work. Rejected writes
and writer.closed mark the stream terminal; the route removes its Request
listener and never asks for further provider output after cancellation. Already
aborted requests do not start generation. Normal EOF does not abort the provider
signal, and successful completion metrics remain intact.

The shared SSE parser cancels on non-EOF exit and always releases its reader.
A post-write abort check also closes the provider iterator when cancellation
rejects a backpressured chunk write, without requesting another result. Request
abort errors both stream sides through the TransformStream controller, since
writer.abort alone can wait behind a blocked write. The standard constructor is
enabled by the preserved 2025-08-13 compatibility date (Cloudflare's default
since 2022-11-30); no compatibility flags are changed.
Google's separate parser now releases its reader too and clears its inactivity
watchdog even after read failure. Cleanup rejections do not replace the original
result/error. Bounded fixtures demonstrate these failures before the repair and
passing cleanup afterward, including providers that produce one late yield.
This does not promise termination of arbitrary provider code that ignores its
abort signal, or that Cloudflare always delivers a physical disconnect signal.

## Separate share-request ownership follow-up

The existing share page resets its receipt/loading state when a valid ID changes.
Only the current effect may apply success, missing or error results; cleanup
ignores stale settlements after an ID change or unmount. This prevents receipt A
from appearing under receipt B's URL during history navigation. Bounded deferred
receipt fixtures exercise the real page/view without contacting Supabase. The
small guard does not change receipt schemas, expiry rules, service calls or
network cancellation, and does not replace hosted deep-link/history acceptance.


Stream constructor compatibility reference:
[Cloudflare compatibility flags](https://developers.cloudflare.com/workers/configuration/compatibility-flags/#compliant-transformstream-constructor).


## Pages build-command drift guard

When Cloudflare's `CF_PAGES=1` build marker is present, loading Next configuration
requires the native build's `PAGES_BUILD=1` and matching source-bound preparation
run ID. Ordinary `next build` / `bun run build`, mismatched preparation and the retired
adapter path therefore fail before Next compilation instead of reporting a
successful UI-only build. Local dev/build/start without the Pages marker remain
unchanged. No dashboard setting, credential or compatibility flag is modified.

This guard assumes Cloudflare's documented build marker has not been overridden
and the selected command actually invokes Next. This is run/source matching,
not an age-expiry check or protection against deliberately replaying matching
preparation and environment values; source code cannot police an
arbitrary dashboard command such as `exit 0` or a different output directory.
Preview acceptance must still confirm the native build's final verification log,
correct source/deployment identity and actual worker/API behavior. Neither this
check nor a local simulation verifies the live Git integration or account plan.
See [Cloudflare build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/).
