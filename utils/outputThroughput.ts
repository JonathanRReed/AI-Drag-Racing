import type { CompletionMetrics } from './providerService';

export interface OutputThroughput {
  value: number | null;
  detail: string;
}

const MIN_STREAMING_WINDOW_MS = 150;
const unavailable = (reason: string): OutputThroughput => ({ value: null, detail: `TPS unavailable: ${reason}` });
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** Output-only throughput, excluding initial waiting. A missing rate is not zero. */
export function getOutputThroughput(metrics: CompletionMetrics | null | undefined): OutputThroughput {
  if (!metrics) return unavailable('metrics are missing.');
  if (metrics.tokenCountSource === 'stream-events') return unavailable('stream events are not output tokens.');

  const { outputTokens, startTime, firstTokenTime, finishTime } = metrics;
  // tokenCount includes input tokens and must never stand in for missing output.
  if (!finite(outputTokens) || outputTokens < 0) return unavailable('output token count is missing or invalid.');
  if (!finite(startTime) || !finite(firstTokenTime) || !finite(finishTime) ||
      firstTokenTime < startTime || finishTime < firstTokenTime) {
    return unavailable('timing is missing or inconsistent.');
  }
  const windowMs = finishTime - firstTokenTime;
  if (!Number.isFinite(windowMs)) return unavailable('timing is not finite.');
  // A sub-150 ms window may be a buffered flush, not reliable throughput.
  if (windowMs < MIN_STREAMING_WINDOW_MS) return unavailable('streaming window is shorter than 150 ms.');
  const value = outputTokens / (windowMs / 1000);
  if (!Number.isFinite(value)) return unavailable('calculated rate is not finite.');

  const countDetail = metrics.tokenCountSource === 'estimated' ? 'estimated output tokens'
    : metrics.tokenCountSource === 'provider-reported' ? 'provider-reported output tokens'
      : 'output tokens (count source unspecified)';
  const prefix = metrics.timingSource === 'demo' ? 'Demo throughput using' : 'Throughput using';
  return { value, detail: `${prefix} ${countDetail}.` };
}
