import React, { useEffect, useState } from "react";

// Pastel theme dot/line colors
const GREYS = [
  "#ccc",
  "#ddd",
  "#eee",
  "#fff",
  "#fff9a6",
  "#fff0f0",
  "#ffe6e6"
];
const LINE_COLORS = [
  "#c9e4ca", // pale green
  "#f7d2c4", // pale orange
  "#c5c3c5", // pale grey
  "#fff9a6"   // pale yellow
];
const STAR_COLORS = [
  "#c9e4ca",
  "#f7d2c4",
  "#fff9a6",
  "#ffe6e6"
];

const DOT_SIZE = 3;
const DOT_GAP = 14;
const STAR_COUNT_RATIO = 0.03; // 3% of dots become stars

function getGrey(idx: number) {
  return GREYS[idx % GREYS.length];
}
function getLineColor(idx: number) {
  return LINE_COLORS[idx % LINE_COLORS.length];
}
function getStarColor(idx: number) {
  return STAR_COLORS[idx % STAR_COLORS.length];
}

const DotMatrixBackground: React.FC = () => {
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 });
  const [starIndices, setStarIndices] = useState<number[]>([]);
  const [dotGap, setDotGap] = useState(DOT_GAP);
  const [starRatio, setStarRatio] = useState(STAR_COUNT_RATIO);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    function updateSize() {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 600) {
        setDotGap(DOT_GAP * 2.3);
        setStarRatio(STAR_COUNT_RATIO * 0.7);
      } else if (window.innerWidth < 900) {
        setDotGap(DOT_GAP * 1.5);
        setStarRatio(STAR_COUNT_RATIO * 0.85);
      } else {
        setDotGap(DOT_GAP);
        setStarRatio(STAR_COUNT_RATIO);
      }
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => { setHasMounted(true); }, []);

  const cols = Math.ceil(dimensions.width / dotGap);
  const rows = Math.ceil(dimensions.height / dotGap);
  const dotCount = rows * cols;

  useEffect(() => {
    const count = Math.max(3, Math.floor(dotCount * starRatio));
    const indices = new Set<number>();
    while (indices.size < count) {
      indices.add(Math.floor(Math.random() * dotCount));
    }
    setStarIndices(Array.from(indices));
    // eslint-disable-next-line
  }, [dotCount, dimensions.width, dimensions.height, starRatio]);

  function shouldConnect(prob = 0.45) {
    return Math.random() < prob;
  }

  // Collect gradient definitions for lines connecting to stars
  const gradients: JSX.Element[] = [];
  const lineElements: JSX.Element[] = [];

  for (let i = 0; i < rows * cols; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const cx = col * dotGap + dotGap / 2;
    const cy = row * dotGap + dotGap / 2;
    const colorIdx = (i + row) % LINE_COLORS.length;
    const lineColor = getLineColor(colorIdx);
    const isStar = starIndices.includes(i);
    const rightIdx = i + 1;
    const belowIdx = i + cols;
    const diagIdx = i + cols + 1;

    // Helper to get dot/star color
    const getDotColor = (idx: number) =>
      starIndices.includes(idx) ? getStarColor(idx) : getGrey(idx);

    // Connect to right neighbor
    if (col < cols - 1 && shouldConnect(0.45)) {
      const toStar = starIndices.includes(rightIdx);
      const gradId = `grad-r-${i}`;
      if (toStar || isStar) {
        gradients.push(
          <linearGradient id={gradId} key={gradId} x1={cx} y1={cy} x2={cx + dotGap} y2={cy} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={getDotColor(i)} stopOpacity="0.7" />
            <stop offset="100%" stopColor={getDotColor(rightIdx)} stopOpacity="0.85" />
          </linearGradient>
        );
      }
      lineElements.push(
        <line
          key={`r-${i}`}
          x1={cx}
          y1={cy}
          x2={cx + dotGap}
          y2={cy}
          stroke={toStar || isStar ? `url(#${gradId})` : lineColor}
          strokeWidth={toStar || isStar ? 1.8 : 1}
          opacity={toStar || isStar ? 0.35 : 0.10}
          style={toStar || isStar ? { filter: 'drop-shadow(0 0 8px #fff9a6)' } : {}}
        />
      );
    }
    // Connect to below neighbor
    if (row < rows - 1 && shouldConnect(0.45)) {
      const toStar = starIndices.includes(belowIdx);
      const gradId = `grad-b-${i}`;
      if (toStar || isStar) {
        gradients.push(
          <linearGradient id={gradId} key={gradId} x1={cx} y1={cy} x2={cx} y2={cy + dotGap} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={getDotColor(i)} stopOpacity="0.7" />
            <stop offset="100%" stopColor={getDotColor(belowIdx)} stopOpacity="0.85" />
          </linearGradient>
        );
      }
      lineElements.push(
        <line
          key={`b-${i}`}
          x1={cx}
          y1={cy}
          x2={cx}
          y2={cy + dotGap}
          stroke={toStar || isStar ? `url(#${gradId})` : lineColor}
          strokeWidth={toStar || isStar ? 1.8 : 1}
          opacity={toStar || isStar ? 0.30 : 0.08}
          style={toStar || isStar ? { filter: 'drop-shadow(0 0 8px #22D4EE)' } : {}}
        />
      );
    }
    // Connect to diagonal neighbor
    if (col < cols - 1 && row < rows - 1 && shouldConnect(0.18)) {
      const toStar = starIndices.includes(diagIdx);
      const gradId = `grad-d-${i}`;
      if (toStar || isStar) {
        gradients.push(
          <linearGradient id={gradId} key={gradId} x1={cx} y1={cy} x2={cx + dotGap} y2={cy + dotGap} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={getDotColor(i)} stopOpacity="0.7" />
            <stop offset="100%" stopColor={getDotColor(diagIdx)} stopOpacity="0.85" />
          </linearGradient>
        );
      }
      lineElements.push(
        <line
          key={`d-${i}`}
          x1={cx}
          y1={cy}
          x2={cx + dotGap}
          y2={cy + dotGap}
          stroke={toStar || isStar ? `url(#${gradId})` : lineColor}
          strokeWidth={toStar || isStar ? 1.8 : 1}
          opacity={toStar || isStar ? 0.28 : 0.07}
          style={toStar || isStar ? { filter: 'drop-shadow(0 0 10px #E879F9)' } : {}}
        />
      );
    }
  }

  if (!hasMounted) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 w-full h-full z-0 pointer-events-none select-none transition-opacity duration-700 opacity-100"
      style={{ background: "transparent", overflow: "hidden" }}
    >
      <svg
        width={dimensions.width}
        height={dimensions.height}
        style={{ position: "absolute", top: 0, left: 0, opacity: 0.13 }}
      >
        <defs>
          <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#fff" floodOpacity="0.7" />
            <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#22D4EE" floodOpacity="0.5" />
            <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#E879F9" floodOpacity="0.3" />
          </filter>
          {gradients}
        </defs>
        {lineElements}
        {/* Draw dots */}
        {Array.from({ length: rows * cols }).map((_, i) => {
          const row = Math.floor(i / cols);
          const col = i % cols;
          const color = getGrey(i + row);
          const delay = ((row + col) % 7) * 0.2;
          // Neon star logic
          const isStar = starIndices.includes(i);
          const starColor = getStarColor(i);
          return isStar ? (
            <circle
              key={i}
              cx={col * dotGap + dotGap / 2}
              cy={row * dotGap + dotGap / 2}
              r={DOT_SIZE * 1.2}
              fill={starColor}
              filter="url(#neon-glow)"
              style={{
                opacity: 0.82,
                animationName: 'starFlicker',
                animationDuration: '4s',
                animationTimingFunction: 'cubic-bezier(.4,0,.2,1)',
                animationIterationCount: 'infinite',
                animationDelay: `${delay}s`,
              }}
            />
          ) : (
            <circle
              key={i}
              cx={col * dotGap + dotGap / 2}
              cy={row * dotGap + dotGap / 2}
              r={DOT_SIZE / 2}
              fill={color}
              style={{
                filter: `drop-shadow(0 0 2px ${color})`,
                opacity: 0.42,
                animationName: 'dotPulse',
                animationDuration: '2.4s',
                animationTimingFunction: 'cubic-bezier(.4,0,.2,1)',
                animationIterationCount: 'infinite',
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </svg>
      <style jsx global>{`
        @keyframes dotPulse {
          0%, 100% { opacity: 0.38; }
          50% { opacity: 0.55; }
        }
        @keyframes starFlicker {
          0%, 100% { opacity: 0.7; }
          10% { opacity: 0.4; }
          20% { opacity: 1; }
          35% { opacity: 0.5; }
          60% { opacity: 1; }
          80% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default DotMatrixBackground;
