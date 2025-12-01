// components/main/Leaderboard.tsx
import React, { useMemo } from 'react';
import GlassCard from '../layout/GlassCard';
import { ResultState } from './ResultsDisplay';
import { getProviderColor } from '../../utils/providerColors';

interface LeaderboardProps {
  results: ResultState[];
}

function calcTotal(ms: ResultState): number | null {
  const m = ms.metrics;
  if (!m || !m.finishTime || !m.startTime) return null;
  return m.finishTime - m.startTime;
}

function calcTtft(r: ResultState): number | null {
  const m = r.metrics;
  if (!m || !m.firstTokenTime || !m.startTime) return null;
  return m.firstTokenTime - m.startTime;
}

function calcTps(r: ResultState): number | null {
  const m = r.metrics;
  if (!m || !m.finishTime || !m.firstTokenTime) return null;
  const seconds = (m.finishTime - m.firstTokenTime) / 1000;
  if (seconds <= 0) return null;
  const out = typeof m.outputTokens === 'number' ? m.outputTokens : m.tokenCount;
  return out / seconds;
}

// Trophy icons for podium positions
const TrophyIcon: React.FC<{ place: number; className?: string }> = ({ place, className = '' }) => {
  const colors = {
    1: { fill: '#FFD700', stroke: '#B8860B', label: '1st' },
    2: { fill: '#C0C0C0', stroke: '#808080', label: '2nd' },
    3: { fill: '#CD7F32', stroke: '#8B4513', label: '3rd' },
  };
  const c = colors[place as keyof typeof colors] || colors[3];
  
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <path 
          d="M12 2L8 6H4v4c0 2.21 1.79 4 4 4h.5L12 17l3.5-3H16c2.21 0 4-1.79 4-4V6h-4L12 2z" 
          fill={c.fill} 
          stroke={c.stroke} 
          strokeWidth="1"
        />
        <path d="M9 17h6v2H9z" fill={c.fill} stroke={c.stroke} strokeWidth="0.5" />
        <path d="M7 19h10v2H7z" fill={c.fill} stroke={c.stroke} strokeWidth="0.5" />
      </svg>
      <span 
        className="absolute -bottom-0.5 -right-0.5 text-[8px] font-bold rounded-full w-3 h-3 flex items-center justify-center"
        style={{ background: c.fill, color: '#000' }}
      >
        {place}
      </span>
    </div>
  );
};

// Speed icon for TTFT section
const SpeedIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" className="opacity-30" />
    <path d="M12 6v2M6 12H8M16 12h2" strokeLinecap="round" />
    <path d="M12 12l3-5" strokeLinecap="round" strokeWidth="2" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

// Lightning icon for TPS section
const LightningIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" />
  </svg>
);

const podiumStyles = [
  'podium-gold border-l-2',
  'podium-silver border-l-2', 
  'podium-bronze border-l-2',
];

const Leaderboard: React.FC<LeaderboardProps> = ({ results }) => {
  const finished = useMemo(() => results.filter(r => r.metrics && !r.error), [results]);

  const topByTtft = useMemo(() => {
    return finished
      .map(r => ({ r, ttft: calcTtft(r) }))
      .filter(x => x.ttft !== null)
      .sort((a, b) => (a.ttft! - b.ttft!))
      .slice(0, 3)
  }, [finished]);

  const topByTps = useMemo(() => {
    return finished
      .map(r => ({ r, tps: calcTps(r) }))
      .filter(x => x.tps !== null)
      .sort((a, b) => (b.tps! - a.tps!))
      .slice(0, 3)
  }, [finished]);

  if (!finished.length) return null;

  return (
    <GlassCard className="p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400/20 to-amber-600/20 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-amber-400" fill="currentColor">
            <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Race Results</h2>
          <p className="text-xs text-[var(--text-muted)]">{finished.length} models finished</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* TTFT Leaderboard */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <SpeedIcon />
            <h3 className="text-[var(--text)] font-semibold">Fastest First Token</h3>
          </div>
          <ul className="space-y-2">
            {topByTtft.map(({ r, ttft }, idx) => (
              <li 
                key={r.id} 
                className={`flex items-center justify-between text-sm p-2 rounded-lg border ${podiumStyles[idx] || ''} transition-all hover:scale-[1.01]`}
              >
                <span className="flex items-center gap-3">
                  <TrophyIcon place={idx + 1} />
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ background: getProviderColor(r.providerName).solid }}
                  />
                  <div className="flex flex-col">
                    <span className="text-[var(--text)] font-medium">{r.providerName}</span>
                    <span className="text-[var(--text-muted)] text-xs truncate max-w-[120px]" title={r.modelName}>
                      {r.modelName}
                    </span>
                  </div>
                </span>
                <span className="text-[var(--text)] font-mono font-semibold tabular-nums">
                  {Math.round(ttft!)} <span className="text-[var(--text-muted)] text-xs font-normal">ms</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* TPS Leaderboard */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <LightningIcon />
            <h3 className="text-[var(--text)] font-semibold">Highest Throughput</h3>
          </div>
          <ul className="space-y-2">
            {topByTps.map(({ r, tps }, idx) => (
              <li 
                key={r.id} 
                className={`flex items-center justify-between text-sm p-2 rounded-lg border ${podiumStyles[idx] || ''} transition-all hover:scale-[1.01]`}
              >
                <span className="flex items-center gap-3">
                  <TrophyIcon place={idx + 1} />
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ background: getProviderColor(r.providerName).solid }}
                  />
                  <div className="flex flex-col">
                    <span className="text-[var(--text)] font-medium">{r.providerName}</span>
                    <span className="text-[var(--text-muted)] text-xs truncate max-w-[120px]" title={r.modelName}>
                      {r.modelName}
                    </span>
                  </div>
                </span>
                <span className="text-[var(--text)] font-mono font-semibold tabular-nums">
                  {tps!.toFixed(1)} <span className="text-[var(--text-muted)] text-xs font-normal">tok/s</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </GlassCard>
  );
};

export default Leaderboard;
