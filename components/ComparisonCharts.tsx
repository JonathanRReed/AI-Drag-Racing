// components/ComparisonCharts.tsx
import React, { useMemo } from 'react';
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

const ComparisonCharts: React.FC<ComparisonChartsProps> = ({ results }) => {
  const theme = useThemeColors();
  const validResults = results.filter(r => r.metrics && !r.isLoading && !r.error);

  const fullLabels = validResults.map(r => `${r.providerName} (${r.modelName})`);
  const ellipsize = (s: string, max = 28) => (s.length > max ? s.slice(0, max - 1) + '…' : s);
  const labels = fullLabels.map(l => ellipsize(l));
  const bgColorsLatency = validResults.map(r => getProviderColor(r.providerName).soft);
  const borderColorsLatency = validResults.map(r => getProviderColor(r.providerName).solid);

  const latencyData = {
    labels,
    datasets: [{
      label: 'Total Time (ms)',
      data: validResults.map(r => r.metrics!.finishTime - r.metrics!.startTime),
      backgroundColor: bgColorsLatency,
      borderColor: borderColorsLatency,
      borderWidth: 1,
      barThickness: 20,
    }],
  };

  const tpsData = {
    labels,
    datasets: [{
      label: 'Tokens per Second',
      data: validResults.map(r => {
        const { metrics } = r;
        if (!metrics || !metrics.finishTime || !metrics.firstTokenTime) return 0;
        const duration = (metrics.finishTime - metrics.firstTokenTime) / 1000;
        return duration > 0 ? metrics.tokenCount / duration : 0;
      }),
      backgroundColor: validResults.map(r => getProviderColor(r.providerName).soft),
      borderColor: validResults.map(r => getProviderColor(r.providerName).solid),
      borderWidth: 1,
      barThickness: 20,
    }],
  };

  const containerHeight = useMemo(() => {
    // 40px per bar + header padding; clamp between 200 and 500
    const perBar = 40;
    const base = 80;
    const h = base + labels.length * perBar;
    return Math.max(220, Math.min(520, h));
  }, [labels.length]);

  return (
    <GlassCard className="p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ height: containerHeight }}>
        <div>
          <Bar
            options={{
              responsive: true,
              maintainAspectRatio: false,
              indexAxis: 'y' as const,
              scales: {
                y: { beginAtZero: true, ticks: { color: theme.muted }, grid: { color: theme.divider } },
                x: { beginAtZero: true, ticks: { color: theme.muted }, grid: { color: theme.divider } },
              },
              elements: baseElements,
              plugins: {
                legend: { display: false },
                title: { display: true, color: theme.text, text: 'Total Response Time (ms)', font: { size: 16 } },
                tooltip: {
                  callbacks: {
                    title: (items: any[]) => items.map(i => fullLabels[i.dataIndex]),
                    label: (ctx: any) => `${ctx.raw.toFixed(2)}`
                  }
                },
              },
            }}
            data={latencyData}
          />
        </div>
        <div>
          <Bar
            options={{
              responsive: true,
              maintainAspectRatio: false,
              indexAxis: 'y' as const,
              scales: {
                y: { beginAtZero: true, ticks: { color: theme.muted }, grid: { color: theme.divider } },
                x: { beginAtZero: true, ticks: { color: theme.muted }, grid: { color: theme.divider } },
              },
              elements: baseElements,
              plugins: {
                legend: { display: false },
                title: { display: true, color: theme.text, text: 'Tokens per Second (TPS)', font: { size: 16 } },
                tooltip: {
                  callbacks: {
                    title: (items: any[]) => items.map(i => fullLabels[i.dataIndex]),
                    label: (ctx: any) => `${ctx.raw.toFixed(2)}`
                  }
                },
              },
            }}
            data={tpsData}
          />
        </div>
      </div>
    </GlassCard>
  );
};

export default ComparisonCharts;

