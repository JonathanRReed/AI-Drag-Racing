// components/main/CountdownOverlay.tsx
import React, { useEffect, useRef, useState } from 'react';

interface CountdownOverlayProps {
  visible: boolean;
  value: number | 'Go!';
}

// One row of the tree: a lamp for each side, lit together.
const TreeRow: React.FC<{ on: boolean; color: 'amber' | 'green'; small?: boolean }> = ({ on, color, small }) => (
  <div className={small ? 'tree-row tree-row-small' : 'tree-row'}>
    <span className="tree-lamp" data-color={color} data-on={on ? 'true' : 'false'} />
    <span className="tree-lamp" data-color={color} data-on={on ? 'true' : 'false'} />
  </div>
);

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
        <div ref={overlayRef} className="tree-overlay" data-go={isGo ? 'true' : 'false'}>
          <div className="tree-stack">
            {/* The starting tree: staged bulbs, three ambers, then green. */}
            <div className="tree" aria-hidden="true">
              <TreeRow on color="amber" small />
              <TreeRow on color="amber" small />
              <TreeRow on={amber1} color="amber" />
              <TreeRow on={amber2} color="amber" />
              <TreeRow on={amber3} color="amber" />
              <TreeRow on={isGo} color="green" />
              <span className="tree-post" />
            </div>
            <div key={animKey} aria-hidden="true" className="tree-count animate-countdown-pop">
              {value}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CountdownOverlay;
