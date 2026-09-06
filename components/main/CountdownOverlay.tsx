// components/main/CountdownOverlay.tsx
import React, { useEffect, useRef, useState } from 'react';

interface CountdownOverlayProps {
  visible: boolean;
  value: number | 'Go!';
}

// Christmas tree light component
const TreeLight: React.FC<{ active: boolean; color: 'yellow' | 'green' }> = ({ active, color }) => {
  const colorClasses = {
    yellow: active ? 'race-light-yellow' : 'race-light-off bg-zinc-800/80',
    green: active ? 'race-light-green' : 'race-light-off bg-zinc-800/80',
  };

  return (
    <div className="flex gap-6 justify-center relative">
      {/* Light housing / visor for realistic look */}
      <div className="relative">
        <div className="absolute inset-x-0 -top-3 h-6 bg-zinc-950 rounded-t-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] z-10 opacity-80" />
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-[3px] border-zinc-900 ${colorClasses[color]} transition-all duration-75 relative z-0`} />
      </div>
      <div className="relative">
        <div className="absolute inset-x-0 -top-3 h-6 bg-zinc-950 rounded-t-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] z-10 opacity-80" />
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-[3px] border-zinc-900 ${colorClasses[color]} transition-all duration-75 relative z-0`} />
      </div>
    </div>
  );
};

const CountdownOverlay: React.FC<CountdownOverlayProps> = ({ visible, value }) => {
  const [animKey, setAnimKey] = useState(0);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const liveRef = useRef<HTMLParagraphElement | null>(null);

  // Reset animation key when value changes for pop effect
  useEffect(() => {
    setAnimKey(k => k + 1);
  }, [value]);

  // The overlay covers the whole page, so everything behind it stops being
  // reachable by keyboard or exposed to assistive technology while it is up.
  useEffect(() => {
    if (!visible) return;
    const overlay = overlayRef.current;
    const parent = overlay?.parentElement;
    if (!overlay || !parent) return;
    const exempt = new Set<Element>([overlay]);
    if (liveRef.current) exempt.add(liveRef.current);
    const behind = Array.from(parent.children).filter(
      (node): node is HTMLElement => node instanceof HTMLElement && !exempt.has(node),
    );
    const previous = behind.map((node) => ({
      node,
      hadInert: node.hasAttribute('inert'),
      ariaHidden: node.getAttribute('aria-hidden'),
    }));
    behind.forEach((node) => {
      node.setAttribute('inert', '');
      node.setAttribute('aria-hidden', 'true');
    });
    return () => {
      previous.forEach(({ node, hadInert, ariaHidden }) => {
        if (!hadInert) node.removeAttribute('inert');
        if (ariaHidden === null) node.removeAttribute('aria-hidden');
        else node.setAttribute('aria-hidden', ariaHidden);
      });
    };
  }, [visible]);

  const isGo = value === 'Go!';
  // Provide specific amber stages based on the 3..2..1 countdown
  const amber1 = value === 3 || value === 2 || value === 1;
  const amber2 = value === 2 || value === 1;
  const amber3 = value === 1;

  return (
    <>
      {/* The numerals are decorative; this is what the countdown says out loud. */}
      <p ref={liveRef} className="sr-only" role="status" aria-live="assertive">
        {visible ? (isGo ? 'Go' : `Race starts in ${value}`) : ''}
      </p>
      {visible && (
        <div ref={overlayRef} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md">
          {/* Background racing stripes */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, #000 35px, #000 70px)',
            }}
          />

          <div className="flex flex-col items-center gap-10">
            {/* Christmas Tree Structured Housing */}
            <div className="relative bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-lg p-5 sm:p-7 border-x-[12px] border-y-4 border-zinc-950 shadow-2xl flex flex-col items-center">
              {/* Main vertical pole dropping downwards */}
              <div className="absolute top-0 bottom-[-100px] left-1/2 -translate-x-1/2 w-8 bg-gradient-to-r from-zinc-800 via-zinc-600 to-zinc-900 border-x-2 border-zinc-950 z-[-1] shadow-2xl"></div>

              {/* Light rows container */}
              <div className="flex flex-col gap-6 sm:gap-8 relative z-10 w-full">

                {/* Pre-stage & Stage bulbs (simulating staged cars) */}
                <div className="flex justify-center gap-6 mb-2">
                  {/* Left lane staged */}
                  <div className="flex gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-zinc-900 bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]" />
                    <div className="w-4 h-4 rounded-full border-2 border-zinc-900 bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]" />
                  </div>
                  {/* Right lane staged */}
                  <div className="flex gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-zinc-900 bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]" />
                    <div className="w-4 h-4 rounded-full border-2 border-zinc-900 bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]" />
                  </div>
                </div>

                {/* Amber 1 */}
                <TreeLight active={amber1} color="yellow" />

                {/* Amber 2 */}
                <TreeLight active={amber2} color="yellow" />

                {/* Amber 3 */}
                <TreeLight active={amber3} color="yellow" />

                {/* Green - GO! */}
                <TreeLight active={isGo} color="green" />
              </div>

            </div>

            {/* Large countdown text */}
            <div
              key={animKey}
              aria-hidden="true"
              className={`font-black select-none z-10 animate-countdown-pop ${isGo ? 'text-[var(--race-green)]' : 'text-white'}`}
              style={{
                textShadow: isGo
                  ? '0 0 40px rgba(34,197,94,0.8), 0 0 80px rgba(34,197,94,0.4), 0 4px 0 #000'
                  : '0 0 30px rgba(250,204,21,0.6), 0 0 60px rgba(250,204,21,0.3), 0 4px 0 #000'
              }}
            >
              <div className="text-8xl md:text-[10rem] tracking-wider italic pr-4">
                {value}
              </div>
            </div>

            {/* Instruction text */}
            <p className="text-white/60 text-lg font-bold z-10 bg-black/50 px-6 py-2 rounded-full border border-white/10 backdrop-blur-md">
              {isGo ? 'Launch!' : 'Stage...'}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default CountdownOverlay;
