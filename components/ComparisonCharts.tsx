// components/ComparisonCharts.tsx
import React, { useMemo, useState } from 'react';
import ModelIdentifier from './ModelIdentifier';
import { formatModelIdentifier, modelIdentifierCanvasText } from '../utils/modelIdentifier';
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

// Keep chart configuration stable until its theme or sorted tooltip labels change.
function createChartOptions(
  theme: { text: string; muted: string; divider: string },
  titleText: string,
  fullLabels: string[]
) {
  return {
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
      title: { display: true, color: theme.text, text: titleText, font: { size: 15, weight: 600 }, padding: { top: 8, bottom: 8 }, align: 'center' as const },
      tooltip: {
        backgroundColor: 'rgba(7,9,13,0.92)',
        titleColor: theme.text,
        bodyColor: theme.text,
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        displayColors: false,
        callbacks: {
          title: (items: any[]) => items.map(i => fullLabels[i.dataIndex]),
          label: (ctx: any) => `${formatNumber(Number(ctx.raw))}`
        }
      },
    },
    layout: { padding: { left: 4, right: 8, top: 4, bottom: 4 } },
    animation: { duration: 450, easing: 'easeOutCubic' as const },
  };
}

const ComparisonCharts: React.FC<ComparisonChartsProps> = ({ results }) => {
  const theme = useThemeColors();
  // Sort toggle: High → Low (default), can flip to Low → High
  const [descending, setDescending] = useState(true);

  // Reuse label and color arrays while the results reference is unchanged.
  const { validResults, labels, fullLabels, baseBgColors, baseBorderColors, needsMapping } = useMemo(() => {
    const valid = results.filter(r => r.metrics && !r.isLoading && !r.error);
    const needsMapping = valid.some(r => formatModelIdentifier(r.modelName).needsDetail || formatModelIdentifier(r.providerName).needsDetail || (r.providerName.length + r.modelName.length + 3) > 28);
    const full = valid.map((r, index) => `${needsMapping ? `Lane ${index + 1}: ` : ''}${modelIdentifierCanvasText(r.providerName)} (${modelIdentifierCanvasText(r.modelName)})`);
    // Never slice an escape, surrogate pair or authored bidi-isolation boundary.
    const shortLabels = needsMapping ? valid.map((_, index) => `Lane ${index + 1}`) : full;
    const bg = valid.map(r => getProviderColor(r.providerName).soft);
    const border = valid.map(r => getProviderColor(r.providerName).solid);
    return {
      validResults: valid,
      needsMapping,
      labels: shortLabels,
      fullLabels: full,
      baseBgColors: bg,
      baseBorderColors: border,
    };
  }, [results]);

  // Sort values, labels, and colors together, and retain the resulting dataset objects.
  const {
    latencySorted,
    latencyData,
    ttftSorted,
    ttftData,
    tpsSorted,
    tpsData,
    tokensSorted,
    tokensData,
  } = useMemo(() => {
    const sortForChart = (vals: number[]) => {
      const idx = vals.map((_, i) => i);
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
    const latSorted = sortForChart(latencyVals);
    const latData = {
      labels: latSorted.labels,
      datasets: [{
        label: 'Total Time (ms)',
        data: latSorted.values,
        backgroundColor: latSorted.bg,
        borderColor: latSorted.border,
        borderWidth: 1,
        barThickness: 20,
      }],
    };

    const ttftVals = validResults.map(r => {
      const m = r.metrics!;
      return m.firstTokenTime ? (m.firstTokenTime - m.startTime) : 0;
    });
    const ttSorted = sortForChart(ttftVals);
    const ttData = {
      labels: ttSorted.labels,
      datasets: [{
        label: 'TTFT (ms)',
        data: ttSorted.values,
        backgroundColor: ttSorted.bg,
        borderColor: ttSorted.border,
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
    const tpSorted = sortForChart(tpsVals);
    const tpData = {
      labels: tpSorted.labels,
      datasets: [{
        label: 'Output Tokens per Second',
        data: tpSorted.values,
        backgroundColor: tpSorted.bg,
        borderColor: tpSorted.border,
        borderWidth: 1,
        barThickness: 20,
      }],
    };

    const tokensVals = validResults.map(r => {
      const m = r.metrics;
      if (!m) return 0;
      return typeof m.outputTokens === 'number' ? m.outputTokens : 0;
    });
    const tokSorted = sortForChart(tokensVals);
    const tokData = {
      labels: tokSorted.labels,
      datasets: [{
        label: 'Output Tokens',
        data: tokSorted.values,
        backgroundColor: tokSorted.bg,
        borderColor: tokSorted.border,
        borderWidth: 1,
        barThickness: 20,
      }],
    };

    return {
      latencySorted: latSorted,
      latencyData: latData,
      ttftSorted: ttSorted,
      ttftData: ttData,
      tpsSorted: tpSorted,
      tpsData: tpData,
      tokensSorted: tokSorted,
      tokensData: tokData,
    };
  }, [validResults, labels, fullLabels, baseBgColors, baseBorderColors, descending]);

  // Stable option references avoid unnecessary react-chartjs-2 option updates.
  const latencyOptions = useMemo(
    () => createChartOptions(theme, 'Total Response Time (ms)', latencySorted.full),
    [theme, latencySorted.full]
  );
  const tpsOptions = useMemo(
    () => createChartOptions(theme, 'Output Tokens per Second (TPS)', tpsSorted.full),
    [theme, tpsSorted.full]
  );
  const ttftOptions = useMemo(
    () => createChartOptions(theme, 'Time To First Token (ms)', ttftSorted.full),
    [theme, ttftSorted.full]
  );
  const tokensOptions = useMemo(
    () => createChartOptions(theme, 'Output Tokens', tokensSorted.full),
    [theme, tokensSorted.full]
  );

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
      {needsMapping && (
        <div className="mb-4 text-xs" role="region" aria-label="Chart model identifiers">
          <p>Chart labels use escaped representations where needed. Requests keep the original IDs.</p>
          <ol className="space-y-2">
            {validResults.map((result, index) => (
              <li key={result.id}>Lane {index + 1}: <ModelIdentifier value={result.modelName} /> via <ModelIdentifier value={result.providerName} /></li>
            ))}
          </ol>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" role="region" aria-label="Performance comparison charts">
        <div style={{ height: chartHeight }} role="img" aria-label="Bar chart showing total response time in milliseconds for each AI model">
          <Bar options={latencyOptions} data={latencyData} />
        </div>
        <div style={{ height: chartHeight }} role="img" aria-label="Bar chart showing output tokens per second for each AI model">
          <Bar options={tpsOptions} data={tpsData} />
        </div>
        <div style={{ height: chartHeight }} role="img" aria-label="Bar chart showing time to first token in milliseconds for each AI model">
          <Bar options={ttftOptions} data={ttftData} />
        </div>
        <div style={{ height: chartHeight }} role="img" aria-label="Bar chart showing total output tokens for each AI model">
          <Bar options={tokensOptions} data={tokensData} />
        </div>
      </div>
    </GlassCard>
  );
};

// Results are updated immutably by the parent reducer.
export default React.memo(ComparisonCharts);
