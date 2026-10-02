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
import { LaneBuffer, LaneSample, decimate, recentCharsPerSec } from '../../utils/raceBuffers';

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


function computeChartBounds(ls: PaceLane[], buffers: Record<string, LaneBuffer>, running: boolean, goTime: number, useNorm: boolean) {
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

  const showFlags = ls.length <= 8;
  const liveT = running ? performance.now() - goTime : maxLastT;
  const xMax = Math.max(liveT, maxLastT, 1000) * 1.04;
  const yDenom = useNorm ? Math.max(leaderChars * 1.08, 1) : Math.max(globalMaxChars * 1.08, 1);

  let leaderId: string | null = null;
  let leaderMax = -1;
  for (const lane of ls) {
    const b = buffers[lane.id];
    if (b && !b.errored && b.chars > leaderMax) {
      leaderMax = b.chars;
      leaderId = lane.id;
    }
  }

  return { anyData, xMax, yDenom, leaderId, liveT, showFlags };
}


function updateLaneSVG(
  lane: PaceLane,
  b: LaneBuffer | undefined,
  path: SVGPathElement | null,
  head: SVGCircleElement | null,
  flag: SVGTextElement | null,
  isLeader: boolean,
  showFlags: boolean,
  x: (t: number) => number,
  y: (chars: number) => number,
  outBuffer?: LaneSample[]
) {
  if (!b || !path) return;

  if (b.samples.length === 0) {
    if (path.getAttribute('d') !== '') path.setAttribute('d', '');
    if (head && head.getAttribute('opacity') !== '0') head.setAttribute('opacity', '0');
    if (flag && flag.getAttribute('opacity') !== '0') flag.setAttribute('opacity', '0');
    return;
  }

  // Reuse outBuffer to avoid array allocation per frame; use fast numeric rounding instead of .toFixed(1)
  const pts = decimate(b.samples, 180, outBuffer);
  let d = '';
  for (let i = 0; i < pts.length; i++) {
    const px = Math.round(x(pts[i].t) * 10) / 10;
    const py = Math.round(y(pts[i].chars) * 10) / 10;
    d += i === 0 ? `M${px},${py} ` : `L${px},${py} `;
  }
  const pathD = d.trim();

  // Bolt optimization: Guard DOM attribute writes to avoid triggering unnecessary SVG path re-parsing
  // and style recalculations on unchanged values during 60fps rAF animation loops.
  if (path.getAttribute('d') !== pathD) {
    path.setAttribute('d', pathD);
  }

  const strokeWidth = isLeader ? '3' : '2';
  if (path.getAttribute('stroke-width') !== strokeWidth) {
    path.setAttribute('stroke-width', strokeWidth);
  }

  const pathOpacity = b.errored ? '0.28' : '1';
  if (path.getAttribute('opacity') !== pathOpacity) {
    path.setAttribute('opacity', pathOpacity);
  }

  const expectedFilter = isLeader && !b.errored ? `drop-shadow(0 0 6px ${lane.color}aa)` : 'none';
  if (path.style.filter !== expectedFilter) {
    path.style.filter = expectedFilter;
  }

  const last = pts[pts.length - 1];
  const hx = x(last.t);
  const hy = y(last.chars);
  const hxStr = hx.toFixed(1);
  const hyStr = hy.toFixed(1);

  if (head) {
    if (head.getAttribute('cx') !== hxStr) head.setAttribute('cx', hxStr);
    if (head.getAttribute('cy') !== hyStr) head.setAttribute('cy', hyStr);

    const rVal = b.done ? '4.5' : isLeader ? '4' : '3';
    if (head.getAttribute('r') !== rVal) head.setAttribute('r', rVal);

    const headOpacity = b.errored ? '0.3' : '1';
    if (head.getAttribute('opacity') !== headOpacity) head.setAttribute('opacity', headOpacity);
  }

  if (flag) {
    if (!showFlags) {
      if (flag.getAttribute('opacity') !== '0') flag.setAttribute('opacity', '0');
    } else {
      const fy = Math.max(PAD.t + 8, Math.min(hy, PAD.t + PLOT_H - 4));
      const nearEdge = hx > PAD.l + PLOT_W - 70;
      const textAnchor = nearEdge ? 'end' : 'start';
      const fxStr = (nearEdge ? hx - 7 : hx + 8).toFixed(1);
      const fyStr = (fy + 3.5).toFixed(1);
      const flagOpacity = b.errored ? '0.4' : '1';

      if (flag.getAttribute('text-anchor') !== textAnchor) flag.setAttribute('text-anchor', textAnchor);
      if (flag.getAttribute('x') !== fxStr) flag.setAttribute('x', fxStr);
      if (flag.getAttribute('y') !== fyStr) flag.setAttribute('y', fyStr);
      if (flag.getAttribute('opacity') !== flagOpacity) flag.setAttribute('opacity', flagOpacity);

      let textContent = '';
      if (b.errored) {
        textContent = 'error';
      } else if (b.done) {
        textContent =
          b.finalOutputTokens != null ? `${compact(b.finalOutputTokens)} tok` : `${compact(b.chars)} ch`;
      } else {
        const cps = recentCharsPerSec(b);
        textContent = `${compact(b.chars)} · ${compact(cps)}/s`;
      }
      if (flag.textContent !== textContent) flag.textContent = textContent;
    }
  }
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
  // Each SVG path consumes the samples synchronously, so all lanes can share one scratch array.
  const decimateBufferRef = useRef<LaneSample[]>([]);

  // Keep a stable reference to lanes for the rAF loop without re-subscribing each render.
  const lanesRef = useRef(lanes);
  lanesRef.current = lanes;
  const normalizeRef = useRef(normalize);
  normalizeRef.current = normalize;

  useEffect(() => {
        const draw = (nowReal: number) => {
      const buffers = buffersRef.current;
      const ls = lanesRef.current;

      const { anyData, xMax, yDenom, leaderId, liveT, showFlags } = computeChartBounds(
        ls,
        buffers,
        running,
        goTimeRef.current,
        normalizeRef.current
      );

      const x = (t: number) => PAD.l + (t / xMax) * PLOT_W;
      const y = (chars: number) => PAD.t + PLOT_H - (Math.min(chars, yDenom) / yDenom) * PLOT_H;

      if (emptyEl.current) emptyEl.current.style.opacity = anyData ? '0' : '1';

      for (const lane of ls) {
        updateLaneSVG(
          lane,
          buffers[lane.id],
          pathEls.current[lane.id],
          headEls.current[lane.id],
          flagEls.current[lane.id],
          lane.id === leaderId,
          showFlags,
          x,
          y,
          decimateBufferRef.current
        );
      }

      // Do not retain samples from removed lanes or previous races between draws.
      decimateBufferRef.current.length = 0;

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
        yLabelEl.current.textContent = normalizeRef.current ? '% of most output' : `${compact(yDenom)} chars`;
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
        stroke="var(--line-1)"
        strokeWidth={1}
      />
      <line
        x1={PAD.l}
        y1={PAD.t}
        x2={PAD.l}
        y2={PAD.t + PLOT_H}
        stroke="var(--line-0)"
        strokeWidth={1}
      />
      {gridYs.map((gy, i) => (
        <line
          key={i}
          x1={PAD.l}
          y1={gy}
          x2={PAD.l + PLOT_W}
          y2={gy}
          stroke="var(--line-0)"
          strokeWidth={1}
        />
      ))}

      {/* axis labels */}
      <text x={PAD.l} y={PAD.t - 4} fill="var(--ink-2)" fontSize={11} fontFamily="inherit">
        <tspan ref={yLabelEl}>chars</tspan>
      </text>
      <text
        x={PAD.l + PLOT_W}
        y={PAD.t + PLOT_H + 20}
        fill="var(--ink-2)"
        fontSize={11}
        textAnchor="end"
        fontFamily="inherit"
      >
        <tspan ref={xLabelEl}>0s</tspan>
      </text>
      <text
        x={PAD.l}
        y={PAD.t + PLOT_H + 20}
        fill="var(--ink-2)"
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
        stroke="var(--ink-2)"
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
        fill="var(--ink-2)"
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
