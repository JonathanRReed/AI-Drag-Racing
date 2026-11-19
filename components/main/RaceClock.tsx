// components/main/RaceClock.tsx
//
// Elapsed time since the shared Go, shown as scoreboard digits. It ticks from its own
// rAF loop while a race runs and freezes on the last finishing lane's time afterwards,
// so the strip itself never has to re-render for a clock.
import React, { useEffect, useRef } from 'react';
import type { LaneBuffer } from '../../utils/raceBuffers';

interface RaceClockProps {
  goTimeRef: React.MutableRefObject<number>;
  buffersRef: React.MutableRefObject<Record<string, LaneBuffer>>;
  raceState: 'idle' | 'countingDown' | 'racing' | 'finished';
  reducedMotion?: boolean;
}

function format(ms: number): string {
  return (Math.max(0, ms) / 1000).toFixed(ms >= 100_000 ? 1 : 2);
}

const RaceClock: React.FC<RaceClockProps> = ({ goTimeRef, buffersRef, raceState, reducedMotion = false }) => {
  const litRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const write = (text: string) => {
      const lit = litRef.current;
      if (!lit || lit.textContent === text) return;
      lit.textContent = text;
      if (lit.parentElement) lit.parentElement.dataset.ghost = text.replace(/[0-9]/g, '8');
    };

    if (raceState === 'finished') {
      let last = 0;
      for (const buffer of Object.values(buffersRef.current || {})) {
        if (buffer.lastT > last) last = buffer.lastT;
      }
      write(format(last));
      return;
    }
    if (raceState !== 'racing') {
      write('0.00');
      return;
    }

    let frame = 0;
    let lastDraw = 0;
    const minGap = reducedMotion ? 250 : 40;
    const tick = () => {
      const now = performance.now();
      if (now - lastDraw >= minGap) {
        lastDraw = now;
        write(format(now - goTimeRef.current));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [raceState, reducedMotion, goTimeRef, buffersRef]);

  return (
    <span className="race-clock" role="timer" aria-label="Seconds since Go">
      <span className="race-clock-digits" aria-hidden="true" data-ghost="8.88">
        <span ref={litRef} className="strip-digits-lit">0.00</span>
      </span>
      <span className="race-clock-unit" aria-hidden="true">s</span>
    </span>
  );
};

export default React.memo(RaceClock);
