import ModelIdentifier from '../ModelIdentifier';
// components/main/RaceLane.tsx
import React, { useMemo, useEffect, useRef, useState } from 'react';
import { CompletionMetrics } from '../../utils/providerService';
import { getProviderById } from '../../utils/providers';
import { getOutputThroughput } from '../../utils/outputThroughput';
import { measuredDuration, presentOutputCount, timingSourceDetail } from '../../utils/measurementPresentation';

export type LaneStatus = 'staging' | 'green' | 'finish' | 'error';

export interface RaceLaneProps {
  providerName: string;
  modelName: string;
  responseText: string;
  metrics: CompletionMetrics | null;
  isLoading: boolean;
  error: string | null;
  laneColor?: string; // optional tint for lane & charts cohesion
  // Optional broadcast control to force collapse/expand from parent toolbars
  force?: { version: number; collapsed: boolean };
  // Initial expanded state — lanes start collapsed when the pace chart leads the layout
  initialExpanded?: boolean;
}

function formatMs(ms?: number | null) {
  return typeof ms === 'number' && !Number.isNaN(ms) ? `${ms.toFixed(0)} ms` : 'N/A';
}

const STATUS_LABEL: Record<LaneStatus, string> = {
  staging: 'Staging',
  green: 'Racing',
  finish: 'Finished',
  error: 'Error',
};

// Status is carried by the word; the dot only repeats it.
const StatusBadge: React.FC<{ status: LaneStatus }> = ({ status }) => (
  <span className="lane-status" data-status={status}>
    <i aria-hidden="true" />
    {STATUS_LABEL[status]}
  </span>
);

type CopyFeedback =
  | { kind: 'idle' }
  | { kind: 'copied'; text: string }
  | { kind: 'failed'; text: string; reason: 'unavailable' | 'blocked' };

const COPIED_MS = 2000;
const FAILED_MS = 4000;
const IDLE: CopyFeedback = { kind: 'idle' };

/**
 * Copy feedback describes one snapshot of the response. A newer click, new
 * streamed text, a new race, or unmount retires every write still pending, so
 * a late clipboard promise can neither set state nor schedule a timer.
 */
function useCopyResponse(text: string) {
  const [feedback, setFeedback] = useState<CopyFeedback>(IDLE);
  const attempt = useRef(0);
  const timer = useRef<number | null>(null);

  const retire = () => {
    attempt.current += 1;
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };

  useEffect(() => {
    retire();
    setFeedback(IDLE);
  }, [text]);

  useEffect(() => retire, []);

  const copy = async () => {
    if (!text) return;
    retire();
    const id = attempt.current;
    const snapshot = text;
    setFeedback(IDLE);
    const settle = (next: CopyFeedback, ms: number) => {
      if (id !== attempt.current) return;
      setFeedback(next);
      timer.current = window.setTimeout(() => {
        timer.current = null;
        setFeedback(IDLE);
      }, ms);
    };
    if (typeof navigator.clipboard?.writeText !== 'function') {
      settle({ kind: 'failed', text: snapshot, reason: 'unavailable' }, FAILED_MS);
      return;
    }
    try {
      await navigator.clipboard.writeText(snapshot);
      settle({ kind: 'copied', text: snapshot }, COPIED_MS);
    } catch {
      settle({ kind: 'failed', text: snapshot, reason: 'blocked' }, FAILED_MS);
    }
  };

  // Until the reset effect runs, never show feedback for text that is no longer displayed.
  return { feedback: feedback.kind !== 'idle' && feedback.text !== text ? IDLE : feedback, copy };
}

function copyFeedbackMessage(feedback: CopyFeedback, displayName: string) {
  if (feedback.kind === 'copied') return `Copied ${displayName} response.`;
  if (feedback.kind === 'failed') {
    return feedback.reason === 'unavailable'
      ? 'Copy failed: clipboard is not available in this browser.'
      : 'Copy failed: clipboard access was blocked.';
  }
  return '';
}

const RaceLane: React.FC<RaceLaneProps> = ({
  providerName,
  modelName,
  responseText,
  metrics,
  isLoading,
  error,
  laneColor = '#38bdf8', // cyan default
  force,
  initialExpanded = true,
}) => {
  const providerCfg = getProviderById(providerName);
  const displayName = providerCfg?.displayName || providerName;
  const logoUrl = providerCfg?.logoUrl;
  const status: LaneStatus = useMemo(() => {
    if (error) return 'error';
    if (metrics) return 'finish';
    if (responseText && !metrics) return 'green';
    return 'staging';
  }, [error, metrics, responseText]);

  const throughput = getOutputThroughput(metrics);
  const outputCount = presentOutputCount(metrics?.outputTokens, metrics?.tokenCountSource, metrics?.timingSource);
  const ttft = measuredDuration(metrics?.startTime, metrics?.firstTokenTime);
  const total = measuredDuration(metrics?.startTime, metrics?.finishTime);

  // Expanded state for the response area
  const [expanded, setExpanded] = useState(initialExpanded);
  const [userControlled, setUserControlled] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastForceVersion = useRef(force?.version);

  const { feedback: copyFeedback, copy } = useCopyResponse(responseText);
  const copyMessage = copyFeedbackMessage(copyFeedback, displayName);

  // A fresh staged run retires the previous run's manual response choice.
  useEffect(() => {
    if (status === 'staging') setUserControlled(false);
  }, [status]);

  // Auto-expand when streaming starts, and auto-scroll on new chunks.
  useEffect(() => {
    if (responseText && !metrics && !userControlled) setExpanded(true);
    if (scrollRef.current && expanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [responseText, metrics, expanded, userControlled]);

  // Auto-collapse only untouched responses; a manual choice cancels the pending timer.
  useEffect(() => {
    if (status !== 'finish' || !expanded || userControlled) return;
    const timer = window.setTimeout(() => setExpanded(false), 6000);
    return () => window.clearTimeout(timer);
  }, [status, expanded, userControlled]);

  // Respond to parent broadcast collapse/expand commands
  useEffect(() => {
    if (!force) return;
    // The initial broadcast is inherited state, not a new user command.
    if (force.version !== lastForceVersion.current) setUserControlled(true);
    lastForceVersion.current = force.version;
    setExpanded(!force.collapsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [force?.version]);

  return (
    <article className="lane-card" data-status={status} data-expanded={expanded ? 'true' : 'false'} style={{ '--lane': laneColor } as React.CSSProperties}>
      <header className="lane-card-head">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={`${displayName} logo`}
            width={32}
            height={32}
            className="lane-card-logo"
            loading="lazy"
          />
        ) : (
          <span className="lane-card-logo lane-card-logo-fallback" aria-hidden>
            {displayName.slice(0, 2).toUpperCase()}
          </span>
        )}
        <div className="lane-card-who">
          <h3 title={displayName}>{displayName}</h3>
          <ModelIdentifier className="lane-card-model" value={modelName} />
        </div>
        <StatusBadge status={status} />
        <div className="lane-card-tools">
          {responseText && (
            <button
              type="button"
              onClick={() => void copy()}
              className="lane-card-tool"
              aria-label={
                copyFeedback.kind === 'copied'
                  ? `Copied ${displayName} response`
                  : copyFeedback.kind === 'failed'
                    ? `Copy failed. Retry copying ${displayName} response`
                    : `Copy ${displayName} response`
              }
              title={copyFeedback.kind === 'copied' ? 'Copied' : copyFeedback.kind === 'failed' ? 'Copy failed' : 'Copy response'}
              data-feedback={copyFeedback.kind}
            >
              {copyFeedback.kind === 'failed' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v5m0 3h.01M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                </svg>
              ) : copyFeedback.kind === 'copied' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => { setUserControlled(true); setExpanded((v) => !v); }}
            className="lane-card-tool"
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${displayName} response`}
            title={expanded ? 'Collapse' : 'Expand'}
          >
            <svg viewBox="0 0 24 24" className="lane-card-chevron" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </header>
      <p role="status" aria-live="polite" className={copyFeedback.kind === 'failed' ? 'lane-card-copy-error' : 'sr-only'}>
        {copyMessage}
      </p>

      {/* Response streaming area */}
      <div
        ref={scrollRef}
        className={`lane-card-response overflow-y-auto ${expanded ? 'max-h-64' : 'max-h-0'}`}
        // A collapsed response is out of reach for everyone, not only out of sight.
        // An open one scrolls, so the keyboard can reach it.
        inert={!expanded}
        tabIndex={expanded ? 0 : undefined}
        role="region"
        aria-label={`${displayName} response text`}
      >
        {isLoading && !responseText && !error && (
          <div className="lane-card-waiting">
            <div className="lane-card-waiting-label">
              <span className="lane-card-spinner animate-spin" aria-hidden="true" />
              <span>Waiting for first token...</span>
            </div>
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-4/5" />
            <div className="skeleton h-3 w-3/5" />
          </div>
        )}
        {error && (
          <div className="lane-card-error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
            </svg>
            <span>{error}</span>
          </div>
        )}
        {responseText && <div className="lane-card-text">{responseText}</div>}
      </div>

      {/* Lane measurements */}
      <div className={`lane-card-metrics ${expanded ? '' : 'hidden'}`}>
        <div>
          <span className="lane-card-metric-label">TTFT</span>
          <span className="lane-card-metric-value">{formatMs(ttft)}</span>
        </div>
        <div>
          <span className="lane-card-metric-label">Total</span>
          <span className="lane-card-metric-value">{formatMs(total)}</span>
        </div>
        <div>
          <span className="lane-card-metric-label">TPS</span>
          <span className="lane-card-metric-value">{throughput.value === null ? 'N/A' : throughput.value.toFixed(2)}</span>
        </div>
        <div>
          <span className="lane-card-metric-label">{outputCount.label}</span>
          <span className="lane-card-metric-value">
            {outputCount.text}
          </span>
        </div>
        <p>
          TTFT: time to first token. TPS: output tokens per second. {throughput.detail} {outputCount.detail} {timingSourceDetail(metrics?.timingSource)}
        </p>
      </div>
    </article>
  );
};

export default React.memo(RaceLane);
