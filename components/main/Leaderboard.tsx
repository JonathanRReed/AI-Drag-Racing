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
  return m.tokenCount / seconds;
}

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
    <GlassCard className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-[var(--text)] font-semibold mb-2">Top 3 Fastest (TTFT)</h3>
          <ul className="space-y-2">
            {topByTtft.map(({ r, ttft }, idx) => (
              <li key={r.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ background: getProviderColor(r.providerName).solid }}
                  />
                  <span className="text-[var(--text)]">{r.providerName}</span>
                  <span className="text-[var(--text-muted)]">({r.modelName})</span>
                </span>
                <span className="text-[var(--text)]">{Math.round(ttft!)} ms</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-[var(--text)] font-semibold mb-2">Top 3 Throughput (TPS)</h3>
          <ul className="space-y-2">
            {topByTps.map(({ r, tps }, idx) => (
              <li key={r.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ background: getProviderColor(r.providerName).solid }}
                  />
                  <span className="text-[var(--text)]">{r.providerName}</span>
                  <span className="text-[var(--text-muted)]">({r.modelName})</span>
                </span>
                <span className="text-[var(--text)]">{tps!.toFixed(2)} tps</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </GlassCard>
  );
};

export default Leaderboard;
