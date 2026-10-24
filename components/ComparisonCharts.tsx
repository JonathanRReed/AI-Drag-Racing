// components/ComparisonCharts.tsx
import React, { useId, useMemo, useState } from 'react';
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
import { getOutputThroughput } from '../utils/outputThroughput';
import { measuredDuration, presentOutputCount, timingSourceDetail } from '../utils/measurementPresentation';

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
  fullLabels: string[],
  valueDetails?: string[]
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
          label: (ctx: any) => {
            const value = ctx.raw === null ? 'N/A' : formatNumber(Number(ctx.raw));
            return valueDetails ? `${value} — ${valueDetails[ctx.dataIndex]}` : value;
          }
        }
      },
    },
    layout: { padding: { left: 4, right: 8, top: 4, bottom: 4 } },
    animation: { duration: 450, easing: 'easeOutCubic' as const },
  };
}

const ComparisonCharts: React.FC<ComparisonChartsProps> = ({ results }) => {
  const theme = useThemeColors();
  const throughputDescriptionId = useId();
  const countDescriptionId = useId();
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
    outputCounts,
    timingDetails,
  } = useMemo(() => {
    const sortForChart = (vals: (number | null)[]) => {
      const idx = vals.map((_, i) => i);
      idx.sort((a, b) => {
        const av = vals[a], bv = vals[b];
        // Unavailable rates stay last in either direction, distinct from zero.
        if (av === null) return bv === null ? 0 : 1;
        if (bv === null) return -1;
        return descending ? bv - av : av - bv;
      });
      return {
        indices: idx,
        labels: idx.map(i => labels[i]),
        full: idx.map(i => fullLabels[i]),
        values: idx.map(i => vals[i]),
        bg: idx.map(i => baseBgColors[i]),
        border: idx.map(i => baseBorderColors[i]),
      };
    };

    const timingDetails = validResults.map(r => timingSourceDetail(r.metrics?.timingSource));
    const latencyVals = validResults.map(r => measuredDuration(r.metrics?.startTime, r.metrics?.finishTime));
    const latOrder = sortForChart(latencyVals);
    const latSorted = { ...latOrder, details: latOrder.indices.map(i => timingDetails[i]) };
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

    const ttftVals = validResults.map(r => measuredDuration(r.metrics?.startTime, r.metrics?.firstTokenTime));
    const ttOrder = sortForChart(ttftVals);
    const ttSorted = { ...ttOrder, details: ttOrder.indices.map(i => timingDetails[i]) };
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

    const throughputs = validResults.map(r => getOutputThroughput(r.metrics));
    const tpOrder = sortForChart(throughputs.map(t => t.value));
    const tpSorted = { ...tpOrder, details: tpOrder.indices.map(i => throughputs[i].detail) };
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

    const outputCounts = validResults.map(r => presentOutputCount(r.metrics?.outputTokens, r.metrics?.tokenCountSource, r.metrics?.timingSource));
    const tokOrder = sortForChart(outputCounts.map(count => count.tokenValue));
    const tokSorted = { ...tokOrder, details: tokOrder.indices.map(i => outputCounts[i].detail) };
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
      outputCounts,
      timingDetails,
    };
  }, [validResults, labels, fullLabels, baseBgColors, baseBorderColors, descending]);

  // Stable option references avoid unnecessary react-chartjs-2 option updates.
  const latencyOptions = useMemo(
    () => createChartOptions(theme, 'Total Response Time (ms)', latencySorted.full, latencySorted.details),
    [theme, latencySorted.full, latencySorted.details]
  );
  const tpsOptions = useMemo(
    () => createChartOptions(theme, 'Output Tokens per Second (TPS)', tpsSorted.full, tpsSorted.details),
    [theme, tpsSorted.full, tpsSorted.details]
  );
  const ttftOptions = useMemo(
    () => createChartOptions(theme, 'Time To First Token (ms)', ttftSorted.full, ttftSorted.details),
    [theme, ttftSorted.full, ttftSorted.details]
  );
  const tokensOptions = useMemo(
    () => createChartOptions(theme, 'Output Tokens (chunks excluded)', tokensSorted.full, tokensSorted.details),
    [theme, tokensSorted.full, tokensSorted.details]
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
      <div className="mb-2 flex flex-wrap items-center justify-end gap-2 text-xs">
        <span className="text-zinc-400">Order: {descending ? 'High → Low' : 'Low → High'}</span>
        <button
          type="button"
          className="btn-ghost text-xs"
          onClick={() => setDescending(v => !v)}
        >
          Sort {descending ? 'low to high' : 'high to low'}
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
        <div style={{ height: chartHeight }} role="img" aria-label="Bar chart showing output tokens per second for each AI model" aria-describedby={throughputDescriptionId}>
          <Bar options={tpsOptions} data={tpsData} />
        </div>
        <div style={{ height: chartHeight }} role="img" aria-label="Bar chart showing time to first token in milliseconds for each AI model">
          <Bar options={ttftOptions} data={ttftData} />
        </div>
        <div style={{ height: chartHeight }} role="img" aria-label="Bar chart showing total output tokens for each AI model" aria-describedby={countDescriptionId}>
          <Bar options={tokensOptions} data={tokensData} />
        </div>
      </div>
      <div id={countDescriptionId} className="mt-4 text-xs text-zinc-400 leading-relaxed">
        <p>The token count chart excludes chunks and unknown units, not treating them as zero. Missing or invalid timing intervals are unavailable, not zero. A valid observed zero interval stays zero. Timing charts may use different clocks; sources are listed below.</p>
        <ul aria-label="Output counts and measurement sources" className="mt-2 space-y-1">
          {tokensSorted.indices.map(index => <li key={validResults[index].id}>
            {needsMapping ? `Lane ${index + 1}` : <><ModelIdentifier value={validResults[index].modelName} /> via <ModelIdentifier value={validResults[index].providerName} /></>}
            {': '}{outputCounts[index].text}. {outputCounts[index].detail} {timingDetails[index]}
          </li>)}
        </ul>
      </div>
      <div id={throughputDescriptionId} className="mt-4 text-xs text-zinc-400 leading-relaxed">
        <p>TPS uses output tokens over the streaming window, excluding initial waiting. Windows below 150 ms, missing or invalid data, and stream-event counts are unavailable, not zero. Unavailable lanes have no throughput bar and sort last.</p>
        <ul aria-label="Throughput values and availability" className="mt-2 space-y-1">
          {tpsSorted.indices.map((index, position) => {
            const result = validResults[index];
            const value = tpsSorted.values[position];
            return <li key={result.id}>
              {needsMapping ? `Lane ${index + 1}` : <><ModelIdentifier value={result.modelName} /> via <ModelIdentifier value={result.providerName} /></>}
              {': '}{value === null ? 'N/A' : `${value.toFixed(2)} TPS`}. {tpsSorted.details[position]}
            </li>;
          })}
        </ul>
      </div>
    </GlassCard>
  );
};

// Results are updated immutably by the parent reducer.
export default React.memo(ComparisonCharts);
