// components/main/DragStrip.tsx
//
// The arcade spectacle: a literal drag strip. Each model is a dragster on its own asphalt
// lane. It idles at the start line until its first token arrives (TTFT = launch), then
// drives right; horizontal position = its share of the leader's output (real overtakes &
// fall-backs), speed-streak intensity = live throughput, and it lunges across the checkered
// the instant its stream finishes. One rAF loop reads the shared LaneBuffers and mutates
// styles imperatively — no React re-render per token. Honest by construction: every channel
// maps to a real measured quantity, never a fabricated "distance".
//
// Position uses CSS `left: calc(frac * (100% - carWidth))` so the browser resolves it
// against the real track width every frame — no brittle JS measurement.

import React, { useEffect, useRef } from 'react';
import { LaneBuffer, recentCharsPerSec } from '../../utils/raceBuffers';
import { PaceLane } from './LivePaceChart';

interface DragStripProps {
  lanes: PaceLane[];
  buffersRef: React.MutableRefObject<Record<string, LaneBuffer>>;
  goTimeRef: React.MutableRefObject<number>;
  running: boolean;
  reducedMotion?: boolean;
}

const FRONT_ANCHOR = 0.82; // leader cruises near the finish; the last stretch is the line
const CAR_W = 60; // px, keeps the nose inside the strip until the finish lunge

function compact(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(Math.round(n));
}

// Side-view top-fuel dragster, facing right. Big slicks at the rear (left).
const Dragster: React.FC<{ color: string }> = ({ color }) => (
  <svg viewBox="0 0 72 30" width={CAR_W} height={25} className="overflow-visible">
    {/* engine flame trailing the rear */}
    <g className="car-flame">
      <path d="M6 15 L-6 12 L-2 15 L-7 18 L6 18 Z" fill="#fbbf24" />
      <path d="M5 15.5 L-2 13.5 L0 15.5 L-3 17 L5 17 Z" fill="#fb7185" />
    </g>
    {/* rear wing */}
    <rect x="3" y="5" width="11" height="3" rx="1" fill={color} />
    <rect x="7" y="8" width="2" height="6" fill="#0a0b0d" />
    {/* long chassis to needle nose */}
    <path d="M9 17 L44 15.5 L70 19.5 L70 21 L16 22.5 Q9 22 9 17 Z" fill={color} />
    <path d="M44 15.5 L70 19.5 L70 21 L52 19 Z" fill="#0a0b0d" opacity="0.35" />
    {/* engine block */}
    <rect x="20" y="11.5" width="9" height="5" rx="1" fill="#0a0b0d" opacity="0.8" />
    {/* driver bubble */}
    <path d="M31 15.5 q4 -5 9 -0.5 z" fill="#0a0b0d" opacity="0.85" />
    <circle cx="35.5" cy="13.6" r="1.9" fill={color} />
    {/* rear slick (left) */}
    <circle cx="16" cy="21.5" r="7.5" fill="#08090b" stroke={color} strokeWidth="1.6" />
    <circle cx="16" cy="21.5" r="2.6" fill={color} />
    {/* front wheel (right) */}
    <circle cx="60" cy="23.5" r="4.4" fill="#08090b" stroke={color} strokeWidth="1.2" />
    <circle cx="60" cy="23.5" r="1.5" fill={color} />
  </svg>
);

const DragStrip: React.FC<DragStripProps> = ({ lanes, buffersRef, running, reducedMotion = false }) => {
  const carRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const streakRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const readoutRefs = useRef<Record<string, HTMLSpanElement | null>>({});
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
      for (const lane of ls) {
        const b = buffers[lane.id];
        if (b && !b.errored && b.chars > leaderChars) {
          leaderChars = b.chars;
          leaderId = lane.id;
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

        // Browser resolves the percentage against the real track width — no JS measurement.
        car.style.left = `calc(${next.toFixed(4)} * (100% - ${CAR_W}px))`;
        car.dataset.running = launched && !b.done && !b.errored ? 'true' : 'false';
        car.dataset.leader = lane.id === leaderId && !b.done && !b.errored ? 'true' : 'false';
        car.style.opacity = b.errored ? '0.35' : '1';

        const speed = recentCharsPerSec(b);
        const streak = streakRefs.current[lane.id];
        if (streak) {
          const active = launched && !b.done && !b.errored && speed > 15;
          streak.style.opacity = active ? String(Math.min(1, 0.25 + speed / 600)) : '0';
          streak.style.width = active ? `${Math.min(64, 14 + speed / 9).toFixed(0)}px` : '0px';
        }

        const lane2 = laneRefs.current[lane.id];
        if (lane2) lane2.dataset.state = b.errored ? 'out' : b.done ? 'fin' : launched ? 'go' : 'stage';

        const readout = readoutRefs.current[lane.id];
        const sub = subRefs.current[lane.id];
        if (readout) {
          if (b.errored) readout.textContent = 'OUT';
          else if (b.done) readout.textContent = `${(b.lastT / 1000).toFixed(2)}s`;
          else if (launched) readout.textContent = compact(speed);
          else readout.textContent = '—';
        }
        if (sub) {
          if (b.errored) sub.textContent = 'DNF';
          else if (b.done) sub.textContent = 'ET · finished';
          else if (launched) sub.textContent = `c/s · ${compact(b.chars)} ch`;
          else sub.textContent = 'staging';
        }
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
  }, [running, reducedMotion, buffersRef]);

  return (
    <div className="space-y-2">
      {lanes.map((lane, i) => (
        <div
          key={lane.id}
          ref={(el) => {
            laneRefs.current[lane.id] = el;
          }}
          data-state="stage"
          className="group grid grid-cols-[104px_minmax(0,1fr)_72px] items-stretch gap-2 sm:grid-cols-[128px_minmax(0,1fr)_84px]"
        >
          {/* lane head: number + provider */}
          <div className="flex min-w-0 items-center gap-2 rounded-l-lg border border-r-0 border-white/5 bg-black/40 px-2">
            <span className="font-speed shrink-0 text-lg text-[var(--text-subtle)]">{i + 1}</span>
            <span className="h-6 w-1 shrink-0 rounded-full" style={{ background: lane.color, boxShadow: `0 0 8px ${lane.color}` }} />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[13px] font-semibold text-white" title={lane.label}>
                {lane.label}
              </span>
              <span className="truncate text-[10px] text-[var(--text-muted)]" title={lane.sublabel}>
                {lane.sublabel}
              </span>
            </span>
          </div>

          {/* the strip */}
          <div className="asphalt relative h-14 overflow-hidden border-y border-white/5">
            {/* lane centerline */}
            <div className="lane-dashes pointer-events-none absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 opacity-60" />
            {/* start line */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-white/40" />
            {/* finish checker */}
            <div className="checker-bg pointer-events-none absolute inset-y-0 right-0 w-3" />
            {/* the dragster */}
            <div
              ref={(el) => {
                carRefs.current[lane.id] = el;
              }}
              data-running="false"
              data-leader="false"
              className="dragster absolute top-1/2"
              style={{ left: 0, transform: 'translateY(-50%)', willChange: 'left' }}
            >
              {/* speed streak trailing behind */}
              <div
                ref={(el) => {
                  streakRefs.current[lane.id] = el;
                }}
                className="speed-streak absolute right-full top-1/2 h-[3px] -translate-y-1/2 rounded-full"
                style={{ color: lane.color, opacity: 0, width: 0 }}
              />
              <Dragster color={lane.color} />
              {/* leader crown */}
              <span className="leader-crown absolute -top-1 right-1 text-[11px]" aria-hidden>
                👑
              </span>
            </div>
          </div>

          {/* readout */}
          <div className="flex flex-col items-end justify-center rounded-r-lg border border-l-0 border-white/5 bg-black/40 px-2 text-right">
            <span
              ref={(el) => {
                readoutRefs.current[lane.id] = el;
              }}
              className="font-speed text-[15px] text-white"
            >
              —
            </span>
            <span
              ref={(el) => {
                subRefs.current[lane.id] = el;
              }}
              className="truncate text-[9px] text-[var(--text-muted)]"
            >
              staging
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default React.memo(DragStrip);
