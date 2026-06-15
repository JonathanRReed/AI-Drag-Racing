// utils/raceBuffers.ts
//
// The live "race engine" data contract.
//
// During a race we must NOT re-render React on every streamed chunk (that re-maps the
// whole results array per token -> ~100 renders/sec with many lanes). Instead each lane
// accumulates into a plain mutable LaneBuffer held in a ref, the Pace Chart + Standings
// read those buffers from a single requestAnimationFrame loop, and React state is only
// committed on a throttled cadence (for the readable transcripts).
//
// Truthfulness rules baked into the shape:
//  - X is ELAPSED ms since the single shared client-side "Go!" instant (the only fair
//    cross-model baseline; all lanes launch from the same dispatch).
//  - Y is CUMULATIVE CHARACTERS streamed. Characters (not SSE chunk count) because chunk
//    granularity varies wildly per provider; characters is a smooth, fair output proxy.
//    Authoritative TOKEN counts come separately from provider-reported CompletionMetrics.

export interface LaneSample {
  t: number; // ms since "Go!"
  chars: number; // cumulative characters streamed at time t
}

export interface LaneBuffer {
  id: string;
  samples: LaneSample[]; // downsampled, strictly increasing t
  chars: number; // running total characters
  firstTokenT: number | null; // client-observed ms-since-Go of first streamed chunk
  lastT: number; // ms-since-Go of most recent activity
  done: boolean;
  errored: boolean;
  finalOutputTokens: number | null; // provider-reported output tokens, when available
}

// Minimum spacing between retained samples. Keeps the polyline bounded for long
// generations (a 60s race -> ~750 points/lane) while staying smooth to the eye.
export const SAMPLE_MS = 60;

export function createLaneBuffer(id: string): LaneBuffer {
  return {
    id,
    samples: [],
    chars: 0,
    firstTokenT: null,
    lastT: 0,
    done: false,
    errored: false,
    finalOutputTokens: null,
  };
}

// Record one streamed chunk. `tNow` is performance.now() - goTime (ms since "Go!").
export function pushChunk(buf: LaneBuffer, content: string, tNow: number): void {
  buf.chars += content.length;
  if (buf.firstTokenT == null) {
    buf.firstTokenT = tNow;
    // Anchor the line at the origin so the launch (idle until first token) reads as
    // horizontal travel before the climb begins.
    if (buf.samples.length === 0) buf.samples.push({ t: tNow, chars: 0 });
    buf.samples.push({ t: tNow, chars: buf.chars });
    buf.lastT = tNow;
    return;
  }
  const last = buf.samples[buf.samples.length - 1];
  if (!last || tNow - last.t >= SAMPLE_MS) {
    buf.samples.push({ t: tNow, chars: buf.chars });
  } else {
    // Coalesce into the most recent sample to cap point density.
    last.t = tNow;
    last.chars = buf.chars;
  }
  buf.lastT = tNow;
}

// Current instantaneous throughput (chars/sec) over a trailing window.
export function recentCharsPerSec(buf: LaneBuffer, windowMs = 1000): number {
  const n = buf.samples.length;
  if (n < 2) return 0;
  const end = buf.samples[n - 1];
  let start = buf.samples[0];
  for (let i = n - 1; i >= 0; i--) {
    if (end.t - buf.samples[i].t >= windowMs) {
      start = buf.samples[i];
      break;
    }
  }
  const dt = (end.t - start.t) / 1000;
  if (dt <= 0) return 0;
  return (end.chars - start.chars) / dt;
}

// Down-sample a sample list to at most `maxPoints` for drawing, preserving first/last.
export function decimate(samples: LaneSample[], maxPoints = 180): LaneSample[] {
  const n = samples.length;
  if (n <= maxPoints) return samples;
  const out: LaneSample[] = [];
  const stride = (n - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints - 1; i++) {
    out.push(samples[Math.round(i * stride)]);
  }
  out.push(samples[n - 1]);
  return out;
}
