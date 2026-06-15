// components/main/StandingsTicker.tsx
//
// The always-visible, colorblind-safe, screen-reader-friendly "who leads now" list.
// Reads the same LaneBuffers as the pace chart on a throttled interval and re-orders
// rows with a FLIP transform animation (skipped under prefers-reduced-motion).
//
// Ranking is by cumulative characters streamed — the honest "furthest along right now".
// Finished lanes keep their final value and gain a finish flag.

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LaneBuffer, recentCharsPerSec } from '../../utils/raceBuffers';
import { PaceLane } from './LivePaceChart';

interface StandingsTickerProps {
  lanes: PaceLane[];
  buffersRef: React.MutableRefObject<Record<string, LaneBuffer>>;
  running: boolean;
  reducedMotion?: boolean;
}

interface Row {
  id: string;
  label: string;
  sublabel: string;
  color: string;
  chars: number;
  cps: number;
  done: boolean;
  errored: boolean;
  finalOutputTokens: number | null;
}

function compact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(Math.round(n));
}

function buildRows(lanes: PaceLane[], buffers: Record<string, LaneBuffer>): Row[] {
  const rows: Row[] = lanes.map((lane) => {
    const b = buffers[lane.id];
    return {
      id: lane.id,
      label: lane.label,
      sublabel: lane.sublabel,
      color: lane.color,
      chars: b?.chars ?? 0,
      cps: b && !b.done ? recentCharsPerSec(b) : 0,
      done: b?.done ?? false,
      errored: b?.errored ?? false,
      finalOutputTokens: b?.finalOutputTokens ?? null,
    };
  });
  rows.sort((a, b) => {
    if (a.errored !== b.errored) return a.errored ? 1 : -1; // errors sink
    return b.chars - a.chars;
  });
  return rows;
}

const StandingsTicker: React.FC<StandingsTickerProps> = ({
  lanes,
  buffersRef,
  running,
  reducedMotion = false,
}) => {
  const [rows, setRows] = useState<Row[]>(() => buildRows(lanes, buffersRef.current));
  const rowRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const prevTops = useRef<Map<string, number>>(new Map());

  // Sample the buffers on an interval (cheap, ~7/sec) while the race runs.
  useEffect(() => {
    setRows(buildRows(lanes, buffersRef.current));
    if (!running) return;
    const tick = () => setRows(buildRows(lanes, buffersRef.current));
    const id = window.setInterval(tick, 150);
    return () => window.clearInterval(id);
  }, [running, lanes, buffersRef]);

  // FLIP: animate rows sliding to their new ranked positions.
  useLayoutEffect(() => {
    if (reducedMotion) return;
    const newTops = new Map<string, number>();
    rowRefs.current.forEach((el, id) => newTops.set(id, el.getBoundingClientRect().top));
    newTops.forEach((top, id) => {
      const prev = prevTops.current.get(id);
      const el = rowRefs.current.get(id);
      if (prev != null && el) {
        const dy = prev - top;
        if (Math.abs(dy) > 0.5) {
          el.style.transition = 'none';
          el.style.transform = `translateY(${dy}px)`;
          requestAnimationFrame(() => {
            el.style.transition = 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)';
            el.style.transform = '';
          });
        }
      }
    });
    prevTops.current = newTops;
  }, [rows, reducedMotion]);

  const leaderChars = rows.find((r) => !r.errored)?.chars ?? 0;

  return (
    <div aria-live="off">
      <ol className="space-y-1.5" reversed={false}>
        {rows.map((r, idx) => {
          const pos = idx + 1;
          const gap = leaderChars - r.chars;
          return (
            <li
              key={r.id}
              ref={(el) => {
                if (el) rowRefs.current.set(r.id, el);
                else rowRefs.current.delete(r.id);
              }}
              className="flex items-center gap-3 rounded-lg border border-white/5 bg-black/30 px-3 py-2"
              style={{ willChange: reducedMotion ? 'auto' : 'transform' }}
            >
              <span
                className="font-speed w-5 shrink-0 text-center text-base"
                style={{ color: r.errored ? 'var(--text-subtle)' : r.color }}
              >
                {r.errored ? '—' : pos}
              </span>
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: r.color, boxShadow: r.errored ? 'none' : `0 0 8px ${r.color}88` }}
                aria-hidden
              />
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="flex items-center gap-1.5 truncate text-sm text-[var(--text)]">
                  {r.label}
                  {r.done && !r.errored && (
                    <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0 text-[var(--text-muted)]" fill="currentColor" aria-label="finished">
                      <path d="M5 3v18h2v-7h12V3H5zm2 2h8v3H7V5zm0 5h10v2H7v-2z" />
                    </svg>
                  )}
                </span>
                <span className="truncate text-[11px] text-[var(--text-muted)]" title={r.sublabel}>
                  {r.sublabel}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="font-speed block text-[15px] text-[var(--text)]">
                  {r.errored
                    ? 'DNF'
                    : r.done && r.finalOutputTokens != null
                      ? `${compact(r.finalOutputTokens)} tok`
                      : `${compact(r.chars)} ch`}
                </span>
                <span className="block font-mono text-[10px] tabular-nums text-[var(--text-muted)]">
                  {r.errored ? '' : pos === 1 ? 'most output' : `-${compact(gap)} ch`}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default StandingsTicker;
