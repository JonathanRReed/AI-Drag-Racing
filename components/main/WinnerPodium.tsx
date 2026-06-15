// components/main/WinnerPodium.tsx
//
// The decisive, celebratory finish the app was missing. One unified podium ranked by a
// CHAMPION metric (defaulting to whatever the race mode actually rewards), plus two named
// sub-awards: "Pole" (quickest first token) and "Fastest Lap" (highest sustained tok/s).
//
// Everything is computed from the authoritative provider-reported CompletionMetrics so the
// climax never contradicts the numbers.

import React, { useMemo, useState } from 'react';
import GlassCard from '../layout/GlassCard';
import { ResultState } from './ResultsDisplay';
import type { RaceMode } from '../sidebar/RaceSettings';
import { getProviderColor } from '../../utils/providerColors';
import { getProviderById } from '../../utils/providers';

type ChampMetric = 'total' | 'ttft' | 'tps' | 'tokens';

interface WinnerPodiumProps {
  results: ResultState[];
  mode: RaceMode;
  reducedMotion?: boolean;
}

const METRICS: { id: ChampMetric; label: string; unit: string; lowerIsBetter: boolean }[] = [
  { id: 'total', label: 'Fastest finish', unit: 'ms', lowerIsBetter: true },
  { id: 'ttft', label: 'Quickest first token', unit: 'ms', lowerIsBetter: true },
  { id: 'tps', label: 'Highest throughput', unit: 'tok/s', lowerIsBetter: false },
  { id: 'tokens', label: 'Most output', unit: 'tok', lowerIsBetter: false },
];

const DEFAULT_METRIC_BY_MODE: Record<RaceMode, ChampMetric> = {
  drag: 'total',
  token_limit: 'total',
  time_limit: 'tokens',
  free_for_all: 'tps',
};

function total(r: ResultState): number | null {
  const m = r.metrics;
  if (!m || !m.finishTime || !m.startTime) return null;
  return m.finishTime - m.startTime;
}
function ttft(r: ResultState): number | null {
  const m = r.metrics;
  if (!m || !m.firstTokenTime || !m.startTime) return null;
  return m.firstTokenTime - m.startTime;
}
function tps(r: ResultState): number | null {
  const m = r.metrics;
  if (!m || !m.finishTime || !m.firstTokenTime) return null;
  const sec = (m.finishTime - m.firstTokenTime) / 1000;
  // Ignore degenerate sub-150ms windows: a provider that buffers then flushes its whole
  // answer at once would otherwise post thousands of "tok/s" and steal Fastest Lap.
  if (sec < 0.15) return null;
  const out = typeof m.outputTokens === 'number' ? m.outputTokens : m.tokenCount;
  return out / sec;
}
function tokens(r: ResultState): number | null {
  const m = r.metrics;
  if (!m) return null;
  return typeof m.outputTokens === 'number' ? m.outputTokens : m.tokenCount;
}

const METRIC_FN: Record<ChampMetric, (r: ResultState) => number | null> = {
  total,
  ttft,
  tps,
  tokens,
};

function fmt(metric: ChampMetric, v: number): string {
  if (metric === 'total' || metric === 'ttft') {
    return v >= 1000 ? `${(v / 1000).toFixed(2)}s` : `${Math.round(v)}ms`;
  }
  if (metric === 'tps') return v.toFixed(1);
  return String(Math.round(v));
}

const MEDALS = [
  { ring: 'var(--race-gold)', label: '1st', podium: 'podium-gold' },
  { ring: 'var(--race-silver)', label: '2nd', podium: 'podium-silver' },
  { ring: 'var(--race-bronze)', label: '3rd', podium: 'podium-bronze' },
];

function displayName(providerId: string): string {
  return getProviderById(providerId)?.displayName || providerId;
}

const WinnerPodium: React.FC<WinnerPodiumProps> = ({ results, mode, reducedMotion = false }) => {
  const [metric, setMetric] = useState<ChampMetric>(DEFAULT_METRIC_BY_MODE[mode] ?? 'total');

  const finished = useMemo(() => results.filter((r) => r.metrics && !r.error), [results]);

  const ranked = useMemo(() => {
    const cfg = METRICS.find((m) => m.id === metric)!;
    const fn = METRIC_FN[metric];
    return finished
      .map((r) => ({ r, v: fn(r) }))
      .filter((x): x is { r: ResultState; v: number } => x.v != null)
      .sort((a, b) => (cfg.lowerIsBetter ? a.v - b.v : b.v - a.v));
  }, [finished, metric]);

  const pole = useMemo(() => {
    const arr = finished
      .map((r) => ({ r, v: ttft(r) }))
      .filter((x): x is { r: ResultState; v: number } => x.v != null)
      .sort((a, b) => a.v - b.v);
    return arr[0];
  }, [finished]);

  const fastestLap = useMemo(() => {
    const arr = finished
      .map((r) => ({ r, v: tps(r) }))
      .filter((x): x is { r: ResultState; v: number } => x.v != null)
      .sort((a, b) => b.v - a.v);
    return arr[0];
  }, [finished]);

  if (ranked.length === 0) return null;

  const top3 = ranked.slice(0, 3);
  // Visual podium order: 2nd, 1st, 3rd.
  const order = top3.length === 3 ? [1, 0, 2] : top3.length === 2 ? [1, 0] : [0];
  const cfg = METRICS.find((m) => m.id === metric)!;
  const anim = reducedMotion ? '' : 'animate-fade-up';

  return (
    <GlassCard className={`relative overflow-hidden p-5 ${reducedMotion ? '' : 'animate-winner-pop'}`} glow>
      {/* celebratory top accent */}
      <div
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: `linear-gradient(to right, transparent, var(--race-gold), transparent)` }}
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300/25 to-amber-600/15 ring-1 ring-amber-400/30">
            <svg viewBox="0 0 24 24" className={`h-5 w-5 text-amber-300 ${reducedMotion ? '' : 'animate-trophy-bounce'}`} fill="currentColor">
              <path d="M5 4h14v3a5 5 0 0 1-4 4.9V14l2 4H7l2-4v-2.1A5 5 0 0 1 5 7V4zm-3 1h2v2a3 3 0 0 1-2-2zm18 0a3 3 0 0 1-2 2V5h2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white heading-tight">Winner&rsquo;s Circle</h2>
            <p className="text-xs text-[var(--text-muted)]">
              Champion by {cfg.label.toLowerCase()} · {finished.length} finished
            </p>
          </div>
        </div>

        {/* champion-metric selector */}
        <div className="inline-flex overflow-hidden rounded-[12px] ring-1 ring-white/10" role="radiogroup" aria-label="Champion metric">
          {METRICS.map((m) => (
            <button
              key={m.id}
              role="radio"
              aria-checked={metric === m.id}
              onClick={() => setMetric(m.id)}
              className={`px-2.5 py-1.5 text-[11px] font-medium transition ${
                metric === m.id ? 'bg-white/[0.12] text-white' : 'bg-white/[0.03] text-[var(--text-muted)] hover:bg-white/[0.08]'
              }`}
              title={`${m.label} (${m.unit})`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* podium */}
      <div
        className="flex items-end justify-center gap-3 sm:gap-5"
        role="group"
        aria-label={`Podium: ${top3.map((e, i) => `${i + 1} ${displayName(e.r.providerName)}`).join(', ')}`}
      >
        {order.map((rankIdx, i) => {
          const entry = top3[rankIdx];
          if (!entry) return null;
          const place = rankIdx; // 0,1,2
          const medal = MEDALS[place];
          const color = getProviderColor(entry.r.providerName).solid;
          const isChamp = place === 0;
          const heights = ['h-28 sm:h-32', 'h-20 sm:h-24', 'h-16 sm:h-20'];
          return (
            <div
              key={entry.r.id}
              className={`flex w-1/3 max-w-[220px] flex-col items-center ${anim}`}
              style={{ animationDelay: reducedMotion ? undefined : `${i * 90}ms` }}
            >
              {/* model chip */}
              <div className="mb-2 flex flex-col items-center text-center">
                <span
                  className="mb-1 h-2.5 w-2.5 rounded-full"
                  style={{ background: color, boxShadow: `0 0 10px ${color}` }}
                />
                <span className={`truncate text-sm font-semibold ${isChamp ? 'text-white' : 'text-[var(--text)]'}`}>
                  {displayName(entry.r.providerName)}
                </span>
                <span className="max-w-[140px] truncate text-[11px] text-[var(--text-muted)]" title={entry.r.modelName}>
                  {entry.r.modelName}
                </span>
              </div>
              {/* podium block */}
              <div
                className={`flex w-full ${heights[place]} flex-col items-center justify-start rounded-t-xl border ${medal.podium} pt-2`}
              >
                <span className="text-base font-bold" style={{ color: medal.ring }}>
                  {medal.label}
                </span>
                <span className="font-speed mt-1 text-[16px] text-white">
                  {fmt(metric, entry.v)}
                </span>
                {(metric === 'tps' || metric === 'tokens') && (
                  <span className="text-[10px] text-[var(--text-muted)]">{cfg.unit}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* sub-awards */}
      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {pole && (
          <div className="flex items-center gap-2.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Pole</span>
            <span className="min-w-0 flex-1 truncate text-sm text-[var(--text)]">
              {displayName(pole.r.providerName)}{' '}
              <span className="text-[var(--text-muted)]">— {pole.r.modelName}</span>
            </span>
            <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-cyan-300">
              {fmt('ttft', pole.v)}
            </span>
          </div>
        )}
        {fastestLap && (
          <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Fastest Lap</span>
            <span className="min-w-0 flex-1 truncate text-sm text-[var(--text)]">
              {displayName(fastestLap.r.providerName)}{' '}
              <span className="text-[var(--text-muted)]">— {fastestLap.r.modelName}</span>
            </span>
            <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-amber-300">
              {fastestLap.v.toFixed(1)} tok/s
            </span>
          </div>
        )}
      </div>

      <p className="mt-3 text-center text-[11px] text-[var(--text-muted)]">
        Ranked by measured timing. Token counts are estimated from output length unless a provider reports exact usage.
        Switch the metric above — every race is a live measurement, not a fixed ranking.
      </p>
    </GlassCard>
  );
};

export default WinnerPodium;
