import type { CompletionMetrics } from './providerService';

/** Presentation only: never rewrite a stored count or infer tokens from chunks. */
export function presentOutputCount(value: unknown, source: unknown, timingSource?: unknown) {
  // Token estimates and legacy outputTokens retain the throughput contract:
  // finite nonnegative values may be fractional. Event counts must be integers.
  const valid = typeof value === 'number' && Number.isFinite(value) && value >= 0;
  const count = valid && (source !== 'stream-events' || Number.isSafeInteger(value)) ? value : null;
  const unspecified = source === undefined || source === null;
  const unit = source === 'stream-events' ? 'chunks'
    : source === 'provider-reported' || source === 'estimated' || unspecified ? 'tokens' : null;
  const label = unit === 'chunks' ? 'Chunks' : unit === 'tokens' ? 'Tokens' : 'Output count';
  const detail = source === 'stream-events' ? 'Content chunks are stream events, not tokenizer tokens.'
    : source === 'provider-reported' ? 'Provider-reported token counts; origin does not guarantee accuracy.'
      : source === 'estimated' ? 'Estimated or mixed token counts; per-field source is unspecified.'
        : unspecified ? 'Output token count source is unspecified.' : 'Count source and unit are unspecified.';
  const simulated = timingSource === 'demo' || source === 'demo';
  return {
    label,
    text: count === null ? 'Not available' : unit ? `${count} ${unit}` : `${count} (unit unknown)`,
    detail: `${simulated ? 'Simulated demo. ' : ''}${detail}`,
    // A token-only chart must not rank content chunks or unknown units as tokens.
    tokenValue: unit === 'tokens' ? count : null,
  };
}

export function timingSourceDetail(source: unknown, hasObservation = true): string {
  if (!hasObservation && source === 'edge-measured') return 'Edge timing not observed.';
  if (!hasObservation && source === 'browser-measured') return 'Browser timing not observed.';
  return source === 'edge-measured' ? 'Edge-measured timing.'
    : source === 'browser-synthetic' ? 'Browser-synthetic timing; not an edge measurement.'
      : source === 'demo' ? 'Simulated demo timing; not a measurement.'
        : source === 'browser-measured' ? 'Browser-measured timing; not an edge measurement.'
          : 'Timing source is unspecified.';
}

export function measuredDuration(start: unknown, end: unknown): number | null {
  if (typeof start !== 'number' || typeof end !== 'number' || !Number.isFinite(start) || !Number.isFinite(end)) return null;
  const elapsed = end - start;
  return Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : null;
}

/** Only explicit edge provenance can support an edge timing label. */
export function measuredEdgeTiming(metrics: CompletionMetrics | null | undefined) {
  return {
    ttftMs: metrics?.timingSource === 'edge-measured' ? measuredDuration(metrics.startTime, metrics.firstTokenTime) : null,
    totalMs: metrics?.timingSource === 'edge-measured' ? measuredDuration(metrics.startTime, metrics.finishTime) : null,
  };
}

export function displayedEdgeValue(value: unknown, source: unknown): number | null {
  return source === 'edge-measured' && typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}
