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

// Status badge component with better visuals
const StatusBadge: React.FC<{ status: LaneStatus }> = ({ status }) => {
  const config = {
    staging: { 
      bg: 'bg-amber-500/20', 
      border: 'border-amber-500/40', 
      text: 'text-amber-400',
      dot: 'bg-amber-400',
      label: 'Staging'
    },
    green: { 
      bg: 'bg-emerald-500/20', 
      border: 'border-emerald-500/40', 
      text: 'text-emerald-400',
      dot: 'bg-emerald-400 animate-pulse',
      label: 'Racing'
    },
    finish: { 
      bg: 'bg-cyan-500/20', 
      border: 'border-cyan-500/40', 
      text: 'text-cyan-400',
      dot: 'bg-cyan-400',
      label: 'Finished'
    },
    error: { 
      bg: 'bg-red-500/20', 
      border: 'border-red-500/40', 
      text: 'text-red-400',
      dot: 'bg-red-400',
      label: 'Error'
    },
  };
  const c = config[status];
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.border} ${c.text} border`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
};

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
    <div className="relative group">
      {/* Racing lane card */}
      <GlassCard className={(expanded ? "p-4" : "p-3") + " relative overflow-hidden"}>
        {/* Racing stripe accent at top */}
        <div 
          className="absolute top-0 left-0 right-0 h-1 opacity-80"
          style={{ background: `linear-gradient(90deg, ${laneColor}, ${laneColor}88)` }}
        />
        
        <div className="flex items-start gap-3 pt-1">
          {/* Mini Christmas tree */}
          <div className="flex flex-col items-center gap-1 pt-1">
            <div 
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                status === 'staging' ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'bg-white/10'
              }`}
            />
            <div 
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                status === 'green' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse' : 'bg-white/10'
              }`}
            />
            <div 
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                status === 'finish' ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]' : 'bg-white/10'
              }`}
            />
            {status === 'finish' && (
              <span className="text-xs mt-0.5">🏁</span>
            )}
          </div>

          {/* Main lane content */}
          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={`${displayName} logo`}
                    className="w-6 h-6 rounded-md"
                    style={{ boxShadow: `0 0 0 1px ${laneColor}44, 0 0 8px ${laneColor}22` }}
                    loading="lazy"
                  />
                ) : (
                  <span
                    className="w-6 h-6 inline-flex items-center justify-center rounded-md text-[11px] font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${laneColor}, ${laneColor}88)`, boxShadow: `0 0 8px ${laneColor}33` }}
                    aria-hidden
                  >
                    {displayName.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm text-[var(--text)] truncate" title={displayName}>
                    {displayName}
                  </h3>
                  <span className="text-[11px] text-[var(--text-muted)] truncate block max-w-[180px]" title={modelName}>
                    {modelName}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={status} />
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition-colors"
                  aria-expanded={expanded}
                  title={expanded ? 'Collapse' : 'Expand'}
                >
                  <svg 
                    viewBox="0 0 24 24" 
                    className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                  >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Response streaming area */}
            <div
              ref={scrollRef}
              className={`overflow-y-auto overflow-x-hidden pr-1 transition-all duration-300 ${
                expanded ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
              }`}
              role="status"
              aria-live="polite"
            >
              {isLoading && !responseText && !error && (
                <div className="space-y-3 py-2">
                  <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin" />
                    <span className="animate-pulse">Waiting for first token...</span>
                  </div>
                  {/* Shimmer skeleton lines */}
                  <div className="space-y-2">
                    <div className="skeleton h-3 w-full rounded" />
                    <div className="skeleton h-3 w-4/5 rounded" />
                    <div className="skeleton h-3 w-3/5 rounded" />
                  </div>
                </div>
              )}
              {error && (
                <div className="flex items-start gap-2 text-red-400 text-sm py-2 px-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}
              {responseText && (
                <div className="text-sm text-white/85 whitespace-pre-wrap break-words leading-relaxed py-1">
                  {responseText}
                </div>
              )}
            </div>

            {/* Metrics bar */}
            <div className={`grid grid-cols-4 gap-2 text-[11px] pt-2 mt-2 border-t border-white/5 ${expanded ? '' : 'border-t-0 pt-0'}`}>
              <div className="flex flex-col">
                <span className="text-[var(--text-muted)] uppercase tracking-wider text-[9px]">TTFT</span>
                <span className="text-[var(--text)] font-mono font-medium">{formatMs(ttft)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[var(--text-muted)] uppercase tracking-wider text-[9px]">Total</span>
                <span className="text-[var(--text)] font-mono font-medium">{formatMs(total)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[var(--text-muted)] uppercase tracking-wider text-[9px]">TPS</span>
                <span className="text-[var(--text)] font-mono font-medium">{calcTps(metrics)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[var(--text-muted)] uppercase tracking-wider text-[9px]">Tokens</span>
                <span className="text-[var(--text)] font-mono font-medium">
                  {metrics && typeof metrics.outputTokens === 'number' ? metrics.outputTokens : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Animated glow border for active racing state */}
        {status === 'green' && !metrics && (
          <div 
            className="pointer-events-none absolute inset-0 rounded-[18px] animate-pulse"
            style={{ 
              border: `1px solid ${laneColor}66`,
              boxShadow: `inset 0 0 12px ${laneColor}22, 0 0 20px ${laneColor}11`
            }}
          />
        )}
        
        {/* Finish celebration glow */}
        {status === 'finish' && (
          <div 
            className="pointer-events-none absolute inset-0 rounded-[18px]"
            style={{ 
              border: `1px solid ${laneColor}44`,
              boxShadow: `inset 0 0 8px ${laneColor}15`
            }}
          />
        )}
      </GlassCard>
    </div>
  );
};

export default RaceLane;
