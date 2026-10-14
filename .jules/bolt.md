## 2026-04-21 - Preventing sidebar re-renders during high-frequency stream state dispatches
**Learning:** In streaming React applications where parent state updates frequently (~11x/sec via `COMMIT_TEXT` during live race streaming), non-memoized sidebar components like `ProviderList` cause full component tree reconciliations on every streamed token tick even when selection props are identical.
**Action:** Wrap heavy sidebar or auxiliary configuration components in `React.memo` to skip re-rendering during high-frequency parent state updates when their input props remain shallowly equal.
