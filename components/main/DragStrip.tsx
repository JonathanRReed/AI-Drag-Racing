import ModelIdentifier from '../ModelIdentifier';
// components/main/DragStrip.tsx
//
// The strip is the page's centerpiece. Each model is a dragster on its own asphalt lane.
// It waits at the start line until its first token arrives (time to first token is the
// launch), then drives right. Horizontal position is its share of the leader's output, so
// overtakes and fall-backs are real. The light trail grows with live throughput, and the
// car crosses the checkered band the instant its stream finishes. Each lane ends in a
// scoreboard: live characters per second while streaming, elapsed time once finished, and
// a win light for the first clean finish. One rAF loop reads the shared LaneBuffers and
// writes styles directly, so React never re-renders per token. Every channel maps to a
// measured quantity. Nothing on the strip is an invented distance.
//
// Position uses CSS `left: calc(frac * (100% - carWidth))` so the browser resolves it
// against the real track width every frame — no brittle JS measurement.

import React, { useEffect, useRef } from 'react';
import { LaneBuffer, recentCharsPerSec } from '../../utils/raceBuffers';
import { applyRaceStyle } from '../../utils/raceDom';
import { PaceLane } from './LivePaceChart';
import type { RaceMode } from '../../utils/raceReceipts';

interface DragStripProps {
  lanes: PaceLane[];
  buffersRef: React.MutableRefObject<Record<string, LaneBuffer>>;
  goTimeRef: React.MutableRefObject<number>;
  running: boolean;
  reducedMotion?: boolean;
  /** Race mode decides whether a first finish earns the win light. */
  mode?: RaceMode;
}

const FRONT_ANCHOR = 0.82; // leader cruises near the finish; the last stretch is the line
// The car width lives in CSS (--car-w) so it can shrink on narrow screens while the
// position math still keeps the nose inside the strip until the finish lunge.
const CAR_W = 'var(--car-w, 104px)';

function compact(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(Math.round(n));
}

/** Lit segments only make sense for digits, so letters never reach the scoreboard. */
function ghostOf(text: string): string {
  return text.replace(/[0-9-]/g, '8');
}

// Side-view top-fuel dragster, facing right. Rear slick and wing on the left,
// needle nose on the right. The body is the provider color; everything else is
// rubber, chrome and shadow so every car reads as the same machine.
const Dragster: React.FC<{ color: string }> = ({ color }) => (
  <svg viewBox="0 0 130 40" className="dragster-svg" aria-hidden="true" focusable="false">
    {/* header flames, only visible while the lane is streaming */}
    <g className="car-flame">
      <path d="M40 15 L34 3 L38 9 L37 0 L43 10 L44 4 L46 15 Z" fill="#ffb224" />
      <path d="M41 15 L38 8 L41 11 L42 6 L44 15 Z" fill="#fff3c4" />
    </g>
    {/* braking parachute, blooms once the lane has finished */}
    <g className="car-chute">
      <path d="M8 12 L-24 2 M8 12 L-24 20 M8 12 L-31 11" stroke="#c9cdc6" strokeWidth="0.7" fill="none" />
      <path d="M-22 0 C-40 3 -40 19 -22 22 L-25 17 C-33 15 -33 7 -25 5 Z" fill="#f4f2e9" />
      <path d="M-27.4 3.2 C-36 7 -36 15 -27.4 18.8 L-28.6 16.4 C-33 14 -33 8 -28.6 5.6 Z" fill={color} />
    </g>
    {/* wheelie bar */}
    <path d="M2 34 L20 27" stroke="#8b9189" strokeWidth="1.4" strokeLinecap="round" />
    <circle cx="2.5" cy="35" r="1.8" fill="#8b9189" />
    {/* rear wing and struts */}
    <path d="M8 4 L28 4 L30 8 L6 8 Z" fill={color} />
    <path d="M14 8 L18 22 M24 8 L26 22" stroke="#101211" strokeWidth="1.6" />
    {/* chassis: long taper to the nose */}
    <path d="M14 26 L52 19 L104 24 L128 29 L128 31 L20 33 Q13 32 14 26 Z" fill={color} />
    <path d="M52 19 L104 24 L128 29 L128 30 L60 24 Z" fill="#000" opacity="0.28" />
    <path d="M22 31.5 L126 30.4" stroke="#fff" strokeOpacity="0.28" strokeWidth="0.8" />
    {/* engine, injector hat and zoomie pipes */}
    <rect x="33" y="15" width="15" height="9" rx="1.5" fill="#1b1e1c" />
    <rect x="36" y="10" width="9" height="5" rx="1" fill="#c9cdc6" />
    <path d="M34 22 L31 15 M38 22 L35 15 M42 22 L39 15" stroke="#c9cdc6" strokeWidth="1.3" strokeLinecap="round" />
    {/* cockpit */}
    <path d="M52 20 Q60 10 70 21 Z" fill="#101211" />
    <circle cx="61" cy="17.6" r="2.6" fill={color} />
    {/* front wing */}
    <path d="M118 31 L129 31 L129 33.5 L116 33.5 Z" fill={color} />
    {/* rear slick */}
    <g className="car-wheel car-wheel-rear">
      <circle cx="22" cy="28" r="10.5" fill="#0c0d0c" />
      <circle cx="22" cy="28" r="10.5" fill="none" stroke="#2c302d" strokeWidth="1" />
      <circle cx="22" cy="28" r="4.6" fill="#c9cdc6" />
      <path d="M22 23.4 V32.6 M17.4 28 H26.6" stroke="#1b1e1c" strokeWidth="1.4" />
    </g>
    {/* front wheel */}
    <g className="car-wheel car-wheel-front">
      <circle cx="112" cy="33" r="5.2" fill="#0c0d0c" />
      <circle cx="112" cy="33" r="2.1" fill="#c9cdc6" />
      <path d="M112 30.9 V35.1" stroke="#1b1e1c" strokeWidth="1" />
    </g>
  </svg>
);

const DragStrip: React.FC<DragStripProps> = ({ lanes, buffersRef, running, reducedMotion = false, mode = 'drag' }) => {
  const carRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const streakRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const readoutRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const unitRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const subRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const laneRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const curFracRef = useRef<Record<string, number>>({});
  const rafRef = useRef<number | null>(null);
  const lastDrawRef = useRef<number>(0);

  const lanesRef = useRef(lanes);
  lanesRef.current = lanes;

  useEffect(() => {
    const draw = () => {
      const buffers = buffersRef.current || {};
      const ls = lanesRef.current;

      let leaderChars = 1;
      let leaderId: string | null = null;
      // The win light belongs to the first clean finish. A Time Trial ranks by
      // output, not by who stopped first, so it never lights one.
      let winnerId: string | null = null;
      let winnerT = Infinity;
      for (const lane of ls) {
        const b = buffers[lane.id];
        if (!b || b.errored) continue;
        if (b.chars > leaderChars) {
          leaderChars = b.chars;
          leaderId = lane.id;
        }
        if (mode !== 'time_limit' && b.done && b.chars > 0 && b.lastT < winnerT) {
          winnerT = b.lastT;
          winnerId = lane.id;
        }
      }

      for (const lane of ls) {
        const b = buffers[lane.id];
        const car = carRefs.current[lane.id];
        if (!b || !car) continue;

        const launched = b.firstTokenT != null;

        let frac: number;
        if (b.errored) frac = curFracRef.current[lane.id] ?? 0;
        else if (b.done) frac = 1;
        else frac = Math.min(1, b.chars / leaderChars) * FRONT_ANCHOR;

        const cur = curFracRef.current[lane.id] ?? 0;
        const next = reducedMotion || b.done || b.errored ? frac : cur + (frac - cur) * 0.16;
        curFracRef.current[lane.id] = next;

        // Update DOM state only when its rendered value changes.
        const leftStr = `calc(${next.toFixed(4)} * (100% - ${CAR_W}))`;
        applyRaceStyle(car.style, 'left', leftStr);

        const runningStr = launched && !b.done && !b.errored ? 'true' : 'false';
        if (car.dataset.running !== runningStr) car.dataset.running = runningStr;

        const leaderStr = lane.id === leaderId && !b.done && !b.errored ? 'true' : 'false';
        if (car.dataset.leader !== leaderStr) car.dataset.leader = leaderStr;

        const opacityStr = b.errored ? '0.35' : '1';
        applyRaceStyle(car.style, 'opacity', opacityStr);

        const speed = recentCharsPerSec(b);
        const streak = streakRefs.current[lane.id];
        if (streak) {
          const active = launched && !b.done && !b.errored && speed > 15;
          const streakOpacity = active ? String(Math.min(1, 0.25 + speed / 600)) : '0';
          const streakWidth = active ? `${Math.min(120, 24 + speed / 6).toFixed(0)}px` : '0px';
          applyRaceStyle(streak.style, 'opacity', streakOpacity);
          applyRaceStyle(streak.style, 'width', streakWidth);
        }

        const lane2 = laneRefs.current[lane.id];
        if (lane2) {
          const stateStr = b.errored ? 'out' : b.done ? 'fin' : launched ? 'go' : 'stage';
          if (lane2.dataset.state !== stateStr) lane2.dataset.state = stateStr;
          const winStr = lane.id === winnerId && !b.errored ? 'true' : 'false';
          if (lane2.dataset.win !== winStr) lane2.dataset.win = winStr;
        }

        // Scoreboard: seven-segment digits, a unit beside them, a plain-words line under.
        let readoutText = '-.--';
        let unitText = '';
        let subText = 'Ready';
        if (b.errored) {
          readoutText = '----';
          subText = 'DNF';
        } else if (b.done) {
          readoutText = (b.lastT / 1000).toFixed(2);
          unitText = 's';
          subText = lane.id === winnerId ? 'first finish' : 'finished';
        } else if (launched) {
          readoutText = String(Math.min(9999, Math.round(speed)));
          subText = `chars/s, ${compact(b.chars)} ch`;
        }

        const readout = readoutRefs.current[lane.id];
        if (readout && readout.textContent !== readoutText) {
          readout.textContent = readoutText;
          // The unlit segments are drawn by CSS from this attribute, so they are
          // never real text that a reader or a contrast check has to consider.
          const digits = readout.parentElement;
          if (digits) digits.dataset.ghost = ghostOf(readoutText);
        }
        const unit = unitRefs.current[lane.id];
        if (unit && unit.textContent !== unitText) unit.textContent = unitText;
        const sub = subRefs.current[lane.id];
        if (sub && sub.textContent !== subText) sub.textContent = subText;
      }
    };

    let stopped = false;
    const loop = () => {
      if (stopped) return;
      const now = performance.now();
      const minGap = reducedMotion ? 100 : 0;
      if (now - lastDrawRef.current >= minGap) {
        lastDrawRef.current = now;
        draw();
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    if (running) rafRef.current = requestAnimationFrame(loop);
    else draw();

    return () => {
      stopped = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [running, reducedMotion, buffersRef, mode]);

  return (
    <div className="strip" data-running={running ? 'true' : 'false'}>
      {lanes.map((lane, i) => (
        <div
          key={lane.id}
          ref={(el) => {
            laneRefs.current[lane.id] = el;
          }}
          data-state="stage"
          data-win="false"
          className="strip-lane"
          style={{ '--lane': lane.color } as React.CSSProperties}
        >
          {/* lane head: plate number + provider */}
          <div className="strip-head">
            <span className="strip-plate" aria-hidden="true">{i + 1}</span>
            <span className="sr-only">Lane {i + 1}:</span>
            <span className="strip-who">
              <span className="strip-name" title={lane.label}>{lane.label}</span>
              <ModelIdentifier className="strip-model" value={lane.sublabel} />
            </span>
          </div>

          {/* the asphalt */}
          <div className="strip-track">
            <span className="strip-groove" aria-hidden="true" />
            <span className="strip-number" aria-hidden="true">{i + 1}</span>
            <span className="strip-startline" aria-hidden="true" />
            <span className="strip-beams" aria-hidden="true"><i /><i /></span>
            <span className="strip-finish" aria-hidden="true" />
            <span className="strip-smoke" aria-hidden="true" />
            <div
              ref={(el) => {
                carRefs.current[lane.id] = el;
              }}
              data-running="false"
              data-leader="false"
              className="dragster"
              style={{ left: 0 }}
            >
              {/* light trail behind the car, longer as the stream speeds up */}
              <div
                ref={(el) => {
                  streakRefs.current[lane.id] = el;
                }}
                className="speed-streak"
                style={{ color: lane.color, opacity: 0, width: 0 }}
              />
              <Dragster color={lane.color} />
              <span className="leader-crown" aria-hidden="true">Lead</span>
            </div>
          </div>

          {/* scoreboard */}
          <div className="strip-board">
            <span className="strip-winlight" aria-hidden="true" />
            <span className="strip-digits" data-ghost="8.88">
              <span
                ref={(el) => {
                  readoutRefs.current[lane.id] = el;
                }}
                className="strip-digits-lit"
              >
                -.--
              </span>
              <span
                ref={(el) => {
                  unitRefs.current[lane.id] = el;
                }}
                className="strip-unit"
              />
            </span>
            <span
              ref={(el) => {
                subRefs.current[lane.id] = el;
              }}
              className="strip-sub"
            >
              Ready
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default React.memo(DragStrip);
