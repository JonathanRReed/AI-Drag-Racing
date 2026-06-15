// components/main/LivePaceChart.tsx
//
// THE headline visualization. A hand-rolled SVG pace chart driven by one
// requestAnimationFrame loop that reads mutable LaneBuffers from a ref — it never
// triggers a React re-render while the race runs.
//
// Encoding (both axes are real measured quantities — never two conflicting "ahead"s):
//   X = elapsed seconds since the shared "Go!"  (so a slow-to-respond model's line
//       literally starts further right — TTFT becomes geometry, no label needed)
//   Y = cumulative characters streamed          (slope = throughput, height = volume)
//
// On finish the loop stops and the last frame is left frozen (a faithful record of the
// client-observed stream), ready to be screenshotted / exported.

import React, { useEffect, useRef } from 'react';
import { LaneBuffer, decimate, recentCharsPerSec } from '../../utils/raceBuffers';

export interface PaceLane {
  id: string;
  label: string; // provider display name
  sublabel: string; // model name
  color: string; // provider solid color
}

interface LivePaceChartProps {
  lanes: PaceLane[];
  buffersRef: React.MutableRefObject<Record<string, LaneBuffer>>;
  goTimeRef: React.MutableRefObject<number>;
  running: boolean;
  reducedMotion?: boolean;
  normalize?: boolean;
}

const VB_W = 1000;
const VB_H = 440;
const PAD = { l: 22, r: 116, t: 16, b: 30 };
const PLOT_W = VB_W - PAD.l - PAD.r;
const PLOT_H = VB_H - PAD.t - PAD.b;

function compact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(Math.round(n));
}

const LivePaceChart: React.FC<LivePaceChartProps> = ({
  lanes,
  buffersRef,
  goTimeRef,
  running,
  reducedMotion = false,
  normalize = false,
}) => {
  const pathEls = useRef<Record<string, SVGPathElement | null>>({});
  const headEls = useRef<Record<string, SVGCircleElement | null>>({});
  const flagEls = useRef<Record<string, SVGTextElement | null>>({});
  const cursorEl = useRef<SVGLineElement | null>(null);
  const xLabelEl = useRef<SVGTSpanElement | null>(null);
  const yLabelEl = useRef<SVGTSpanElement | null>(null);
  const emptyEl = useRef<SVGTextElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastDrawRef = useRef<number>(0);

  // Keep a stable reference to lanes for the rAF loop without re-subscribing each render.
  const lanesRef = useRef(lanes);
  lanesRef.current = lanes;
  const normalizeRef = useRef(normalize);
  normalizeRef.current = normalize;

  useEffect(() => {
    const draw = (nowReal: number) => {
      const buffers = buffersRef.current;
      const ls = lanesRef.current;

      // Determine the time axis extent.
      let maxLastT = 0;
      let anyData = false;
      let globalMaxChars = 1;
      let leaderChars = 1;
      for (const lane of ls) {
        const b = buffers[lane.id];
        if (!b) continue;
        if (b.samples.length) anyData = true;
        if (b.lastT > maxLastT) maxLastT = b.lastT;
        if (!b.errored && b.chars > globalMaxChars) globalMaxChars = b.chars;
        if (!b.errored && b.chars > leaderChars) leaderChars = b.chars;
      }
      const showFlags = ls.length <= 8; // beyond this, lean on the standings list for identity
      const liveT = running ? performance.now() - goTimeRef.current : maxLastT;
      const xMax = Math.max(liveT, maxLastT, 1000) * 1.04;
      const useNorm = normalizeRef.current;
      const yDenom = useNorm ? Math.max(leaderChars * 1.08, 1) : Math.max(globalMaxChars * 1.08, 1);

      const x = (t: number) => PAD.l + (t / xMax) * PLOT_W;
      const y = (chars: number) => PAD.t + PLOT_H - (Math.min(chars, yDenom) / yDenom) * PLOT_H;

      if (emptyEl.current) emptyEl.current.style.opacity = anyData ? '0' : '1';

      // Leader (most characters, not errored) gets emphasis.
      let leaderId: string | null = null;
      let leaderMax = -1;
      for (const lane of ls) {
        const b = buffers[lane.id];
        if (b && !b.errored && b.chars > leaderMax) {
          leaderMax = b.chars;
          leaderId = lane.id;
        }
      }

      for (const lane of ls) {
        const b = buffers[lane.id];
        const path = pathEls.current[lane.id];
        const head = headEls.current[lane.id];
        const flag = flagEls.current[lane.id];
        if (!b || !path) continue;

        if (b.samples.length === 0) {
          path.setAttribute('d', '');
          if (head) head.setAttribute('opacity', '0');
          if (flag) flag.setAttribute('opacity', '0');
          continue;
        }

        const pts = decimate(b.samples);
        let d = '';
        for (let i = 0; i < pts.length; i++) {
          const px = x(pts[i].t).toFixed(1);
          const py = y(pts[i].chars).toFixed(1);
          d += (i === 0 ? 'M' : 'L') + px + ',' + py + ' ';
        }
        path.setAttribute('d', d.trim());

        const isLeader = lane.id === leaderId;
        path.setAttribute('stroke-width', isLeader ? '3' : '2');
        path.setAttribute('opacity', b.errored ? '0.28' : '1');
        path.style.filter = isLeader && !b.errored ? `drop-shadow(0 0 6px ${lane.color}aa)` : 'none';

        const last = pts[pts.length - 1];
        const hx = x(last.t);
        const hy = y(last.chars);
        if (head) {
          head.setAttribute('cx', hx.toFixed(1));
          head.setAttribute('cy', hy.toFixed(1));
          head.setAttribute('r', b.done ? '4.5' : isLeader ? '4' : '3');
          head.setAttribute('opacity', b.errored ? '0.3' : '1');
        }
        if (flag) {
          if (!showFlags) {
            flag.setAttribute('opacity', '0');
          } else {
            const fy = Math.max(PAD.t + 8, Math.min(hy, PAD.t + PLOT_H - 4));
            const nearEdge = hx > PAD.l + PLOT_W - 70;
            flag.setAttribute('text-anchor', nearEdge ? 'end' : 'start');
            flag.setAttribute('x', (nearEdge ? hx - 7 : hx + 8).toFixed(1));
            flag.setAttribute('y', (fy + 3.5).toFixed(1));
            flag.setAttribute('opacity', b.errored ? '0.4' : '1');
            if (b.errored) {
              flag.textContent = 'error';
            } else if (b.done) {
              flag.textContent =
                b.finalOutputTokens != null ? `${compact(b.finalOutputTokens)} tok` : `${compact(b.chars)} ch`;
            } else {
              const cps = recentCharsPerSec(b);
              flag.textContent = `${compact(b.chars)} · ${compact(cps)}/s`;
            }
          }
        }
      }

      // Sweeping NOW cursor + axis labels.
      if (cursorEl.current) {
        if (running && !reducedMotion && anyData) {
          const cx = x(liveT);
          cursorEl.current.setAttribute('x1', cx.toFixed(1));
          cursorEl.current.setAttribute('x2', cx.toFixed(1));
          cursorEl.current.setAttribute('opacity', '0.5');
        } else {
          cursorEl.current.setAttribute('opacity', '0');
        }
      }
      if (xLabelEl.current) xLabelEl.current.textContent = `${(xMax / 1000).toFixed(1)}s`;
      if (yLabelEl.current) {
        yLabelEl.current.textContent = useNorm ? '% of most output' : `${compact(yDenom)} chars`;
      }
    };

    let stopped = false;
    const loop = () => {
      if (stopped) return;
      const now = performance.now();
      // Under reduced motion, cap redraws to ~8fps (no smooth sweep).
      const minGap = reducedMotion ? 120 : 0;
      if (now - lastDrawRef.current >= minGap) {
        lastDrawRef.current = now;
        draw(now);
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    if (running) {
      rafRef.current = requestAnimationFrame(loop);
    } else {
      // Final freeze frame.
      draw(performance.now());
    }

    return () => {
      stopped = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [running, reducedMotion, normalize, buffersRef, goTimeRef]);

  // Static horizontal gridlines (4 bands).
  const gridYs = [0.25, 0.5, 0.75].map((f) => PAD.t + PLOT_H - f * PLOT_H);

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      width="100%"
      className="block"
      style={{ minHeight: 220, maxHeight: 460 }}
      role="img"
      aria-label="Live pace chart: cumulative characters streamed over elapsed time for each model. The accessible standings list below carries the same information as text."
      preserveAspectRatio="xMidYMid meet"
    >
      {/* plot frame */}
      <line
        x1={PAD.l}
        y1={PAD.t + PLOT_H}
        x2={PAD.l + PLOT_W}
        y2={PAD.t + PLOT_H}
        stroke="rgba(255,255,255,0.14)"
        strokeWidth={1}
      />
      <line
        x1={PAD.l}
        y1={PAD.t}
        x2={PAD.l}
        y2={PAD.t + PLOT_H}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={1}
      />
      {gridYs.map((gy, i) => (
        <line
          key={i}
          x1={PAD.l}
          y1={gy}
          x2={PAD.l + PLOT_W}
          y2={gy}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={1}
        />
      ))}

      {/* axis labels */}
      <text x={PAD.l} y={PAD.t - 4} fill="rgba(244,245,247,0.45)" fontSize={11} fontFamily="inherit">
        <tspan ref={yLabelEl}>chars</tspan>
      </text>
      <text
        x={PAD.l + PLOT_W}
        y={PAD.t + PLOT_H + 20}
        fill="rgba(244,245,247,0.45)"
        fontSize={11}
        textAnchor="end"
        fontFamily="inherit"
      >
        <tspan ref={xLabelEl}>0s</tspan>
      </text>
      <text
        x={PAD.l}
        y={PAD.t + PLOT_H + 20}
        fill="rgba(244,245,247,0.45)"
        fontSize={11}
        fontFamily="inherit"
      >
        0s · launch
      </text>

      {/* sweeping NOW cursor */}
      <line
        ref={cursorEl}
        x1={PAD.l}
        y1={PAD.t}
        x2={PAD.l}
        y2={PAD.t + PLOT_H}
        stroke="rgba(255,255,255,0.55)"
        strokeWidth={1}
        strokeDasharray="3 4"
        opacity={0}
      />

      {/* one polyline + head + value flag per lane */}
      {lanes.map((lane) => (
        <g key={lane.id}>
          <path
            ref={(el) => {
              pathEls.current[lane.id] = el;
            }}
            fill="none"
            stroke={lane.color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            d=""
          />
          <circle
            ref={(el) => {
              headEls.current[lane.id] = el;
            }}
            r={3}
            fill={lane.color}
            opacity={0}
          />
          <text
            ref={(el) => {
              flagEls.current[lane.id] = el;
            }}
            fontSize={11.5}
            fontFamily="inherit"
            fill={lane.color}
            opacity={0}
          />
        </g>
      ))}

      <text
        ref={emptyEl}
        x={PAD.l + PLOT_W / 2}
        y={PAD.t + PLOT_H / 2}
        fill="rgba(244,245,247,0.4)"
        fontSize={13}
        textAnchor="middle"
        fontFamily="inherit"
      >
        Waiting for the first token…
      </text>
    </svg>
  );
};

export default React.memo(LivePaceChart);
