## 2026-04-21 - Preventing sidebar re-renders during high-frequency stream state dispatches
**Learning:** In streaming React applications where parent state updates frequently (~11x/sec via `COMMIT_TEXT` during live race streaming), non-memoized sidebar components like `ProviderList` cause full component tree reconciliations on every streamed token tick even when selection props are identical.
**Action:** Wrap heavy sidebar or auxiliary configuration components in `React.memo` to skip re-rendering during high-frequency parent state updates when their input props remain shallowly equal.

## 2026-04-21 - Memoizing auxiliary components with stable callbacks during stream updates
**Learning:** `React.memo` on auxiliary components (`RaceHistory`, `FinishSummary`) avoids tree reconciliations during high-frequency stream updates (~11x/sec), provided parent callbacks (`onDelete`, `onClear`) are stabilized via `useCallback`. Mutable refs (`buffersRef`) must avoid default `React.memo` since ref identity remains static while `.current` mutates.
**Action:** Always wrap event handler props in `useCallback` when memoizing child components, and avoid `React.memo` on components reading mutable refs directly unless a custom `arePropsEqual` handles ref mutations.
