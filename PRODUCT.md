# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary users are builders and technically curious people comparing AI models and provider endpoints from their own browser, network, and location. They need to know which option feels fastest and most reliable for their actual workload rather than relying only on global averages.

Advanced users use the product as a lightweight experiment lab. They need repeated runs, variance, prompt-size and concurrency controls, route diagnostics, cost context, and exportable evidence without operating a benchmarking stack themselves.

## Product Purpose

AI Drag Racing is a private-by-default, bring-your-own-key performance laboratory. Quick Race answers which selected model and provider feels fastest for this user right now. Experiment Lab supports more controlled comparisons and explains the difference between browser-perceived performance and provider-side timing.

Success means a user can configure and run a fair comparison, understand why a result occurred, distinguish measured values from estimates, reproduce or share a sanitized receipt, and avoid mistaking a personal observation for a global benchmark.

## Positioning

AI Drag Racing measures the path that generic leaderboards cannot: this user, from this location, through this route, with this prompt and provider endpoint, at this moment. It complements global model and provider datasets rather than attempting to replace Artificial Analysis, OpenRouter, or other aggregate sources.

## Operating Context

- Users bring provider API keys and select models or endpoints to compare.
- Quick Race provides an approachable, single-run comparison.
- Experiment Lab adds repeated runs, variance, concurrency, prompt-size testing, route diagnostics, cost overlays, and reproducible receipts.
- Results separate browser-to-result timing from edge-to-provider timing. User-perceived end-to-end performance determines the default winner.
- Model selections may be prefilled from AI Stats or Prompt Info through internal ecosystem deep links.
- Ordinary race history remains local to the browser and expires automatically after 30 days.

## Capabilities and Constraints

- The complete core product remains free. New work must not introduce required paid infrastructure or automatic spending of the owner's provider credits.
- Real races use visitor-supplied provider keys. Keys must never be persisted, logged, echoed, or included in receipts.
- Private runs must not persist prompts, generated output, keys, IP addresses, or precise location on the server.
- Local history supports immediate deletion and export, and automatically expires after 30 days.
- Users may create unlisted share links containing normalized metrics only. Share records expire after 30 days.
- Shared metrics may include models, providers, coarse edge region, timing, token counts, run settings, methodology version, and timestamp. They exclude prompts, generated output, API keys, IP addresses, and precise location.
- Local receipt export may include prompt or generated output only through explicit opt-in with a clear privacy warning.
- Users may explicitly opt in to longer-lived de-identified aggregates. Raw share records still expire after 30 days. Aggregates require minimum cohort sizes and must be labeled community observations rather than authoritative benchmarks.
- Any server-backed sharing must reuse an existing database only after a live capacity, RLS, retention, backup, and security preflight.
- Keyless demonstrations may use clearly labeled example data. Example data must never be presented as measured evidence.
- AI Drag Racing does not publish global average performance or feed user results into AI Stats rankings.
- AI Stats owns canonical model identities. AI Drag Racing consumes the internal identity contract for model selection and deep linking.

## Brand Commitments

Preserve the name AI Drag Racing and its recognizable racing identity. The racing metaphor should make live performance tangible through lanes, countdowns, telemetry, and finish moments. The product must present itself as a credible performance laboratory first, with racing expression used selectively rather than applied to every surface.

Product language must be direct about sample size, route dependence, estimates, missing values, failures, and the limits of personal observations. It must not imply that one race proves a universally fastest or best model.

## Evidence on Hand

- The existing Next.js application contains provider selection, BYOK configuration, streaming provider adapters, race modes, drag-strip and telemetry visualizations, result summaries, comparison charts, privacy copy, and methodology copy.
- The deployed site at `https://ai-dragrace.jonathanrreed.com/` is the incumbent functional and visual baseline.
- The repository contains unit coverage for SSE parsing, provider registration, and race-buffer calculations, but does not yet contain durable experiment receipts, browser E2E coverage, a complete CI workflow, or a production rollback runbook.
- Current timing and token metrics include both measured and estimated values. Future work must preserve that distinction.
- No established user base or representative public race corpus exists. Future work must not fabricate aggregate claims, popularity, or global benchmark authority.

## Product Principles

1. Personal evidence before global claims. Describe exactly what this race measured and where.
2. Private by default. Minimize stored data, require explicit sharing, and expire raw records.
3. One clear result before deeper analysis. Make the outcome understandable, then expose diagnostics and methodology.
4. Measured and estimated values stay distinct. Missing precision must remain visible.
5. Free core and zero automatic spend. BYOK and existing free infrastructure preserve access without hidden costs.

## Accessibility & Inclusion

The web experience must meet WCAG 2.2 AA expectations, work with keyboard and screen readers, avoid color-only state encoding, respect reduced-motion preferences, expose text and table equivalents for charts, and remain fully usable on mobile and compact-height displays.
