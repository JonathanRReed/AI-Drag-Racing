import ModelIdentifier from '../ModelIdentifier';
// components/main/StandingsTicker.tsx
//
// The always-visible, colorblind-safe, screen-reader-friendly "who leads now" list.
// Reads the same LaneBuffers as the pace chart on a throttled interval and re-orders
// rows with a FLIP transform animation (skipped under prefers-reduced-motion).
//
// Ranking is by cumulative characters streamed — the honest "furthest along right now".
// Finished lanes keep their final value and gain a finish flag.

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LaneBuffer } from '../../utils/raceBuffers';
import { PaceLane } from './LivePaceChart';
import type { RaceMode } from '../sidebar/RaceSettings';
import { compareRaceMeasurements } from '../../utils/raceRanking';

interface StandingsTickerProps {
  lanes: PaceLane[];
  buffersRef: React.MutableRefObject<Record<string, LaneBuffer>>;
  running: boolean;
  mode: RaceMode;
  reducedMotion?: boolean;
}

interface Row {
  id: string;
  label: string;
  sublabel: string;
  color: string;
  chars: number;
  elapsedMs: number;
  done: boolean;
  errored: boolean;
  finalOutputTokens: number | null;
}

function compact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(Math.round(n));
}

function buildRows(
  lanes: PaceLane[],
  buffers: Record<string, LaneBuffer>,
  running: boolean,
  mode: RaceMode,
): Row[] {
  const rows: Row[] = lanes.map((lane) => {
    const b = buffers[lane.id];
    return {
      id: lane.id,
      label: lane.label,
      sublabel: lane.sublabel,
      color: lane.color,
      chars: b?.chars ?? 0,
      elapsedMs: b?.lastT ?? 0,
      done: b?.done ?? false,
      errored: b?.errored ?? false,
      finalOutputTokens: b?.finalOutputTokens ?? null,
    };
  });
  rows.sort((a, b) => {
    if (a.errored !== b.errored) return a.errored ? 1 : -1; // errors sink
    if (!running && mode !== 'time_limit') {
      if (a.done !== b.done) return a.done ? -1 : 1;
      if (a.done && b.done) return compareRaceMeasurements(mode, { totalMs: a.elapsedMs }, { totalMs: b.elapsedMs });
    }
    return compareRaceMeasurements('time_limit', { outputCharacters: a.chars }, { outputCharacters: b.chars });
  });
  return rows;
}

const StandingsTicker: React.FC<StandingsTickerProps> = ({
  lanes,
  buffersRef,
  running,
  mode,
  reducedMotion = false,
}) => {
  const [rows, setRows] = useState<Row[]>(() => buildRows(lanes, buffersRef.current, running, mode));
  const rowRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const prevTops = useRef<Map<string, number>>(new Map());

  // Sample the buffers on an interval (cheap, ~7/sec) while the race runs.
  useEffect(() => {
    setRows(buildRows(lanes, buffersRef.current, running, mode));
    if (!running) return;
    const tick = () => setRows(buildRows(lanes, buffersRef.current, running, mode));
    const id = window.setInterval(tick, 150);
    return () => window.clearInterval(id);
  }, [running, lanes, buffersRef, mode]);

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
  const leaderElapsed = rows.find((r) => !r.errored && r.done)?.elapsedMs ?? 0;
  const rankByFinish = !running && mode !== 'time_limit';

  return (
    <div aria-live="off">
      <ol className="standings" reversed={false}>
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
              className="standings-row"
              data-errored={r.errored ? 'true' : 'false'}
              data-first={pos === 1 && !r.errored ? 'true' : 'false'}
              style={{ willChange: reducedMotion ? 'auto' : 'transform', '--lane': r.color } as React.CSSProperties}
            >
              <span className="standings-pos">
                {r.errored ? <abbr title="Did not finish">DNF</abbr> : pos}
              </span>
              <span className="standings-who">
                <span className="standings-name">
                  {r.label}
                  {r.done && !r.errored && (
                    <svg viewBox="0 0 24 24" fill="currentColor" role="img" aria-label="finished">
                      <path d="M5 3v18h2v-7h12V3H5zm2 2h8v3H7V5zm0 5h10v2H7v-2z" />
                    </svg>
                  )}
                </span>
                <ModelIdentifier className="standings-model" value={r.sublabel} />
              </span>
              <span className="standings-value">
                <span>
                  {r.errored
                    ? 'DNF'
                    : rankByFinish && r.done
                      ? `${(r.elapsedMs / 1000).toFixed(2)} s`
                      : mode !== 'time_limit' && r.done && r.finalOutputTokens != null
                      ? `${compact(r.finalOutputTokens)} tok`
                      : `${compact(r.chars)} ch`}
                </span>
                <span>
                  {r.errored
                    ? ''
                    : rankByFinish && r.done
                      ? pos === 1
                        ? 'fastest finish'
                        : `+${((r.elapsedMs - leaderElapsed) / 1000).toFixed(2)} s`
                      : pos === 1
                        ? 'most output'
                        : gap > 0
                          ? `-${compact(gap)} ch`
                          : 'level'}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      {mode === 'time_limit' && <p className="standings-note">Output length: UTF-16 code units (JavaScript text.length), not tokens or visible characters. Ties keep lane order.</p>}
    </div>
  );
};

export default StandingsTicker;
