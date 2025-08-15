// components/main/RaceLane.tsx
import React, { useMemo, useEffect, useRef, useState } from 'react';
import GlassCard from '../layout/GlassCard';
import { CompletionMetrics } from '../../utils/providerService';
import { getProviderById } from '../../utils/providers';

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
}

function formatMs(ms?: number) {
  return typeof ms === 'number' && !Number.isNaN(ms) ? `${ms.toFixed(0)} ms` : 'N/A';
}

function calcTps(metrics: CompletionMetrics | null): string {
  if (!metrics || !metrics.finishTime || !metrics.firstTokenTime) return 'N/A';
  const duration = (metrics.finishTime - metrics.firstTokenTime) / 1000;
  if (duration <= 0) return 'N/A';
  const out = typeof metrics.outputTokens === 'number' ? metrics.outputTokens : metrics.tokenCount;
  return (out / duration).toFixed(2);
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

  const ttft = metrics?.firstTokenTime ? metrics.firstTokenTime - metrics.startTime : undefined;
  const total = metrics?.finishTime ? metrics.finishTime - metrics.startTime : undefined;

  // Expanded state for the response area
  const [expanded, setExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const autoCollapseTimer = useRef<number | null>(null);

  // Auto-expand when streaming starts, and auto-scroll on new chunks
  useEffect(() => {
    if (responseText && !metrics) setExpanded(true);
    if (scrollRef.current && expanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [responseText, metrics, expanded]);

  // Auto-collapse a few seconds after finishing, unless the user has manually collapsed/expanded.
  useEffect(() => {
    // Clear any existing timer first
    if (autoCollapseTimer.current) {
      clearTimeout(autoCollapseTimer.current);
      autoCollapseTimer.current = null;
    }
    if (status === 'finish' && expanded) {
      autoCollapseTimer.current = window.setTimeout(() => {
        setExpanded(false);
      }, 6000); // 6s after finish
    }
    return () => {
      if (autoCollapseTimer.current) {
        clearTimeout(autoCollapseTimer.current);
        autoCollapseTimer.current = null;
      }
    };
  }, [status, expanded]);

  // Respond to parent broadcast collapse/expand commands
  useEffect(() => {
    if (!force) return;
    // On each version change, set according to requested state
    setExpanded(!force.collapsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [force?.version]);

  return (
    <div className="relative">
      {/* Neon lane border */}
      <GlassCard className={(expanded ? "p-4" : "p-3") + " relative"}>
        <div className="flex items-start gap-3">
          {/* Checkered accent strip */}
          <div
            className="self-stretch w-1 rounded-sm opacity-60"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, color-mix(in srgb, var(--text) 55%, transparent) 0 5px, var(--divider) 5px 10px)'
            }}
          />
          {/* Christmas tree lights (simple) */}
          <div className="flex flex-col items-center mt-1">
            {/* Staging (amber) */}
            <span
              className="block w-2.5 h-2.5 rounded-full mb-1"
              style={{
                background: status === 'staging' || status === 'green' || status === 'finish' ? 'var(--warning)' : 'rgba(255,255,255,0.08)',
                boxShadow: status === 'staging' || status === 'green' || status === 'finish' ? '0 0 8px color-mix(in srgb, var(--warning) 80%, transparent)' : 'none'
              }}
            />
            {/* Green (go) */}
            <span
              className="block w-2.5 h-2.5 rounded-full mb-1"
              style={{
                background: status === 'green' || status === 'finish' ? 'var(--success)' : 'rgba(255,255,255,0.08)',
                boxShadow: status === 'green' || status === 'finish' ? '0 0 8px color-mix(in srgb, var(--success) 80%, transparent)' : 'none'
              }}
            />
            {/* Finish (checkered) */}
            <span className="block w-3 h-3 rounded-sm text-xs leading-3">
              {status === 'finish' ? '🏁' : ' '}
            </span>
          </div>

          {/* Main lane content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={`${displayName} logo`}
                    className="w-5 h-5 rounded-sm"
                    style={{ boxShadow: `0 0 0 1px ${laneColor}66` }}
                    loading="lazy"
                  />
                ) : (
                  <span
                    className="w-5 h-5 inline-flex items-center justify-center rounded-sm text-[10px] font-bold text-white"
                    style={{ background: laneColor, boxShadow: `0 0 0 1px ${laneColor}66` }}
                    aria-hidden
                  >
                    {displayName.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <h3 className="font-semibold text-base text-[var(--text)] truncate max-w-[16ch] sm:max-w-[20ch]" title={displayName}>{displayName}</h3>
                <span className="text-xs text-[var(--text-muted)] truncate max-w-[40ch] sm:max-w-[48ch]" title={modelName}>
                  ({modelName})
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] shrink-0">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-md border"
                  style={{
                    borderColor: status === 'error' ? 'color-mix(in srgb, var(--danger) 70%, transparent)' : 'var(--ring)',
                    color: status === 'error' ? 'var(--danger)' : 'var(--text-muted)'
                  }}
                >
                  {status}
                </span>
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="btn-ghost px-2 py-1 text-[13px]"
                  aria-expanded={expanded}
                >
                  {expanded ? 'Collapse' : 'Expand'}
                </button>
              </div>
            </div>

            {/* Response streaming area */}
            <div
              ref={scrollRef}
              className={`mt-2 overflow-y-auto overflow-x-hidden pr-1 transition-[max-height] duration-300 ${expanded ? 'max-h-64' : 'max-h-12'}`}
              role="status"
              aria-live="polite"
            >
              {isLoading && !responseText && !error && (
                <p className="text-[var(--text-muted)]">Staging… waiting for start.</p>
              )}
              {error && <p className="text-[13px] text-[var(--danger)]">Error: {error}</p>}
              <p className={`whitespace-pre-wrap break-words text-white/90 ${expanded ? '' : 'line-clamp-3'}`}>{responseText}</p>
            </div>

            {/* Metrics */}
            <div className="mt-3 grid grid-cols-4 gap-2 text-[11px] text-[var(--text-muted)]">
              <div><span className="font-semibold">TTFT:</span> {formatMs(ttft)}</div>
              <div><span className="font-semibold">Total:</span> {formatMs(total)}</div>
              <div><span className="font-semibold">TPS:</span> {calcTps(metrics)}</div>
              <div>
                <span className="font-semibold">Output Tokens:</span>{' '}
                {metrics && typeof metrics.outputTokens === 'number' ? metrics.outputTokens : '—'}
              </div>
            </div>
          </div>
        </div>
        {/* Clipped, state-aware lane glow (kept inside GlassCard to avoid bleed) */}
        {(() => {
          const accent = status === 'error' ? 'var(--danger)' : laneColor;
          const border = !expanded
            ? `${accent}44`
            : (status === 'green' && !metrics)
              ? `${accent}66`
              : (status === 'finish')
                ? `${accent}44`
                : `${accent}33`;
          const insetGlow = !expanded
            ? `inset 0 0 4px ${accent}22`
            : (status === 'green' && !metrics)
              ? `inset 0 0 8px ${accent}33`
              : (status === 'finish')
                ? `inset 0 0 6px ${accent}22`
                : `inset 0 0 5px ${accent}22`;
          return (
            <div
              className="pointer-events-none absolute inset-0 rounded-[18px]"
              style={{ border: `1px solid ${border}`, boxShadow: insetGlow }}
            />
          );
        })()}
      </GlassCard>
    </div>
  );
};

export default RaceLane;
