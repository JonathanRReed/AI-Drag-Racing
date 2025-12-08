// components/ComparisonCharts.tsx
import React, { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from 'chart.js';
import { ResultState } from './main/ResultsDisplay';
import GlassCard from './layout/GlassCard';
import { getProviderColor } from '../utils/providerColors';

// Register only what we use (Legend is disabled)
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip);

interface ComparisonChartsProps {
  results: ResultState[];
}

// Resolve CSS variable colors on client for OLED-friendly charts
function useThemeColors() {
  return useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        text: '#E6E7EB',
        muted: 'rgba(230,231,235,0.64)',
        divider: 'rgba(255,255,255,0.08)'
      };
    }
    const css = getComputedStyle(document.documentElement);
    const text = css.getPropertyValue('--text').trim() || '#E6E7EB';
    const muted = css.getPropertyValue('--text-muted').trim() || 'rgba(230,231,235,0.64)';
    const divider = css.getPropertyValue('--divider').trim() || 'rgba(255,255,255,0.08)';
    return { text, muted, divider };
  }, []);
}

const baseElements = { bar: { borderRadius: 6 } } as const;

// Small helpers for numeric tick formatting
const formatNumber = (v: number) => {
  if (!isFinite(v)) return String(v);
  if (Math.abs(v) >= 1000) return v.toLocaleString();
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
};

const ComparisonCharts: React.FC<ComparisonChartsProps> = ({ results }) => {
  const theme = useThemeColors();
  const validResults = results.filter(r => r.metrics && !r.isLoading && !r.error);

  const fullLabels = validResults.map(r => `${r.providerName} (${r.modelName})`);
  const ellipsize = (s: string, max = 28) => (s.length > max ? s.slice(0, max - 1) + '…' : s);
  const labels = fullLabels.map(l => ellipsize(l));
  const baseBgColors = validResults.map(r => getProviderColor(r.providerName).soft);
  const baseBorderColors = validResults.map(r => getProviderColor(r.providerName).solid);

  // Sort toggle: High → Low (default), can flip to Low → High
  const [descending, setDescending] = useState(true);

  // Helper to sort arrays consistently for a given metric
  const sortForChart = (vals: number[]) => {
    const idx = vals.map((v, i) => i);
    idx.sort((a, b) => (descending ? vals[b] - vals[a] : vals[a] - vals[b]));
    return {
      labels: idx.map(i => labels[i]),
      full: idx.map(i => fullLabels[i]),
      values: idx.map(i => vals[i]),
      bg: idx.map(i => baseBgColors[i]),
      border: idx.map(i => baseBorderColors[i]),
    };
  };

  const latencyVals = validResults.map(r => r.metrics!.finishTime - r.metrics!.startTime);
  const latencySorted = sortForChart(latencyVals);
  const latencyData = {
    labels: latencySorted.labels,
    datasets: [{
      label: 'Total Time (ms)',
      data: latencySorted.values,
      backgroundColor: latencySorted.bg,
      borderColor: latencySorted.border,
      borderWidth: 1,
      barThickness: 20,
    }],
  };

  const ttftVals = validResults.map(r => {
    const m = r.metrics!;
    return m.firstTokenTime ? (m.firstTokenTime - m.startTime) : 0;
  });
  const ttftSorted = sortForChart(ttftVals);
  const ttftData = {
    labels: ttftSorted.labels,
    datasets: [{
      label: 'TTFT (ms)',
      data: ttftSorted.values,
      backgroundColor: ttftSorted.bg,
      borderColor: ttftSorted.border,
      borderWidth: 1,
      barThickness: 20,
    }],
  };

  const tpsVals = validResults.map(r => {
    const { metrics } = r;
    if (!metrics || !metrics.finishTime || !metrics.firstTokenTime) return 0;
    const duration = (metrics.finishTime - metrics.firstTokenTime) / 1000;
    const out = typeof metrics.outputTokens === 'number' ? metrics.outputTokens : metrics.tokenCount;
    return duration > 0 ? out / duration : 0;
  });
  const tpsSorted = sortForChart(tpsVals);
  const tpsData = {
    labels: tpsSorted.labels,
    datasets: [{
      label: 'Output Tokens per Second',
      data: tpsSorted.values,
      backgroundColor: tpsSorted.bg,
      borderColor: tpsSorted.border,
      borderWidth: 1,
      barThickness: 20,
    }],
  };

  const tokensVals = validResults.map(r => {
    const m = r.metrics;
    if (!m) return 0;
    return typeof m.outputTokens === 'number' ? m.outputTokens : 0;
  });
  const tokensSorted = sortForChart(tokensVals);
  const tokensData = {
    labels: tokensSorted.labels,
    datasets: [{
      label: 'Output Tokens',
      data: tokensSorted.values,
      backgroundColor: tokensSorted.bg,
      borderColor: tokensSorted.border,
      borderWidth: 1,
      barThickness: 20,
    }],
  };

  const chartHeight = useMemo(() => {
    // Height per chart (not the whole grid). Keep compact but readable.
    const perBar = 28; // px per category bar
    const base = 72;   // title + paddings
    const h = base + labels.length * perBar;
    return Math.max(160, Math.min(400, h));
  }, [labels.length]);

  return (
    <GlassCard className="p-4">
      <div className="mb-2 flex items-center justify-end">
        <button
          type="button"
          className="btn-ghost text-xs"
          onClick={() => setDescending(v => !v)}
          title={descending ? 'Sorted: High → Low (click to reverse)' : 'Sorted: Low → High (click to reverse)'}
        >
          Sort: {descending ? 'High → Low' : 'Low → High'}
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" role="region" aria-label="Performance comparison charts">
        <div style={{ height: chartHeight }} role="img" aria-label="Bar chart showing total response time in milliseconds for each AI model">
          <Bar
            options={{
              responsive: true,
              maintainAspectRatio: false,
              indexAxis: 'y' as const,
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: { color: theme.muted, font: { size: 11 } },
                  grid: { color: theme.divider },
                  border: { display: false },
                },
                x: {
                  beginAtZero: true,
                  ticks: {
                    color: theme.muted,
                    font: { size: 11 },
                    callback: (val: unknown) => formatNumber(Number(val)),
                  },
                  grid: { color: theme.divider },
                  border: { display: false },
                },
              },
              elements: baseElements,
              plugins: {
                legend: { display: false },
                title: { display: true, color: theme.text, text: 'Total Response Time (ms)', font: { size: 15, weight: 600 }, padding: { top: 8, bottom: 8 }, align: 'center' },
                tooltip: {
                  backgroundColor: 'rgba(7,9,13,0.92)',
                  titleColor: theme.text,
                  bodyColor: theme.text,
                  borderColor: 'rgba(255,255,255,0.08)',
                  borderWidth: 1,
                  displayColors: false,
                  callbacks: {
                    title: (items: any[]) => items.map(i => latencySorted.full[i.dataIndex]),
                    label: (ctx: any) => `${formatNumber(Number(ctx.raw))}`
                  }
                },
              },
              layout: { padding: { left: 4, right: 8, top: 4, bottom: 4 } },
              animation: { duration: 450, easing: 'easeOutCubic' },
            }}
            data={latencyData}
          />
        </div>
        <div style={{ height: chartHeight }} role="img" aria-label="Bar chart showing output tokens per second for each AI model">
          <Bar
            options={{
              responsive: true,
              maintainAspectRatio: false,
              indexAxis: 'y' as const,
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: { color: theme.muted, font: { size: 11 } },
                  grid: { color: theme.divider },
                  border: { display: false },
                },
                x: {
                  beginAtZero: true,
                  ticks: {
                    color: theme.muted,
                    font: { size: 11 },
                    callback: (val: unknown) => formatNumber(Number(val)),
                  },
                  grid: { color: theme.divider },
                  border: { display: false },
                },
              },
              elements: baseElements,
              plugins: {
                legend: { display: false },
                title: { display: true, color: theme.text, text: 'Output Tokens per Second (TPS)', font: { size: 15, weight: 600 }, padding: { top: 8, bottom: 8 }, align: 'center' },
                tooltip: {
                  backgroundColor: 'rgba(7,9,13,0.92)',
                  titleColor: theme.text,
                  bodyColor: theme.text,
                  borderColor: 'rgba(255,255,255,0.08)',
                  borderWidth: 1,
                  displayColors: false,
                  callbacks: {
                    title: (items: any[]) => items.map(i => tpsSorted.full[i.dataIndex]),
                    label: (ctx: any) => `${formatNumber(Number(ctx.raw))}`
                  }
                },
              },
              layout: { padding: { left: 4, right: 8, top: 4, bottom: 4 } },
              animation: { duration: 450, easing: 'easeOutCubic' },
            }}
            data={tpsData}
          />
        </div>
        <div style={{ height: chartHeight }} role="img" aria-label="Bar chart showing time to first token in milliseconds for each AI model">
          <Bar
            options={{
              responsive: true,
              maintainAspectRatio: false,
              indexAxis: 'y' as const,
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: { color: theme.muted, font: { size: 11 } },
                  grid: { color: theme.divider },
                  border: { display: false },
                },
                x: {
                  beginAtZero: true,
                  ticks: {
                    color: theme.muted,
                    font: { size: 11 },
                    callback: (val: unknown) => formatNumber(Number(val)),
                  },
                  grid: { color: theme.divider },
                  border: { display: false },
                },
              },
              elements: baseElements,
              plugins: {
                legend: { display: false },
                title: { display: true, color: theme.text, text: 'Time To First Token (ms)', font: { size: 15, weight: 600 }, padding: { top: 8, bottom: 8 }, align: 'center' },
                tooltip: {
                  backgroundColor: 'rgba(7,9,13,0.92)',
                  titleColor: theme.text,
                  bodyColor: theme.text,
                  borderColor: 'rgba(255,255,255,0.08)',
                  borderWidth: 1,
                  displayColors: false,
                  callbacks: {
                    title: (items: any[]) => items.map(i => ttftSorted.full[i.dataIndex]),
                    label: (ctx: any) => `${formatNumber(Number(ctx.raw))}`
                  }
                },
              },
              layout: { padding: { left: 4, right: 8, top: 4, bottom: 4 } },
              animation: { duration: 450, easing: 'easeOutCubic' },
            }}
            data={ttftData}
          />
        </div>
        <div style={{ height: chartHeight }} role="img" aria-label="Bar chart showing total output tokens for each AI model">
          <Bar
            options={{
              responsive: true,
              maintainAspectRatio: false,
              indexAxis: 'y' as const,
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: { color: theme.muted, font: { size: 11 } },
                  grid: { color: theme.divider },
                  border: { display: false },
                },
                x: {
                  beginAtZero: true,
                  ticks: {
                    color: theme.muted,
                    font: { size: 11 },
                    callback: (val: unknown) => formatNumber(Number(val)),
                  },
                  grid: { color: theme.divider },
                  border: { display: false },
                },
              },
              elements: baseElements,
              plugins: {
                legend: { display: false },
                title: { display: true, color: theme.text, text: 'Output Tokens', font: { size: 15, weight: 600 }, padding: { top: 8, bottom: 8 }, align: 'center' },
                tooltip: {
                  backgroundColor: 'rgba(7,9,13,0.92)',
                  titleColor: theme.text,
                  bodyColor: theme.text,
                  borderColor: 'rgba(255,255,255,0.08)',
                  borderWidth: 1,
                  displayColors: false,
                  callbacks: {
                    title: (items: any[]) => items.map(i => tokensSorted.full[i.dataIndex]),
                    label: (ctx: any) => `${formatNumber(Number(ctx.raw))}`
                  }
                },
              },
              layout: { padding: { left: 4, right: 8, top: 4, bottom: 4 } },
              animation: { duration: 450, easing: 'easeOutCubic' },
            }}
            data={tokensData}
          />
        </div>
      </div>
    </GlassCard>
  );
};

export default ComparisonCharts;

