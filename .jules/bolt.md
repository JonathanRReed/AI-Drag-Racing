## 2026-09-05 - Preventing StandingsTicker re-renders during high-frequency stream state dispatches
**Learning:** During live race streaming, `COMMIT_TEXT` updates parent state ~11x/sec. Unmemoized live components like `StandingsTicker` re-run `buildRows` and reconcile DOM elements on every single parent state dispatch even though `lanes` and `buffersRef` props remain shallowly equal.
**Action:** Wrap live sidebar or ticker components in `React.memo` so they update exclusively via their own internal throttled sampling interval (e.g., 150ms) rather than on every parent stream token tick.

## 2026-04-21 - Preventing sidebar re-renders during high-frequency stream state dispatches
**Learning:** In streaming React applications where parent state updates frequently (~11x/sec via `COMMIT_TEXT` during live race streaming), non-memoized sidebar components like `ProviderList` cause full component tree reconciliations on every streamed token tick even when selection props are identical.
**Action:** Wrap heavy sidebar or auxiliary configuration components in `React.memo` to skip re-rendering during high-frequency parent state updates when their input props remain shallowly equal.
