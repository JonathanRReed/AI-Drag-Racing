// components/ComparisonCharts.tsx
import React from 'react';
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

// Register only what we use (Legend is disabled)
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip);

interface ComparisonChartsProps {
  results: ResultState[];
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: { display: true, color: '#fff', font: { size: 16 } },
    tooltip: {
      callbacks: {
        label: (ctx: any) => `${ctx.raw.toFixed(2)}`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { color: 'rgba(255, 255, 255, 0.7)' },
      grid: { color: 'rgba(255, 255, 255, 0.1)' },
    },
    x: {
      ticks: { color: 'rgba(255, 255, 255, 0.7)' },
      grid: { display: false },
    },
  },
};

const ComparisonCharts: React.FC<ComparisonChartsProps> = ({ results }) => {
  const validResults = results.filter(r => r.metrics && !r.isLoading && !r.error);

  const labels = validResults.map(r => `${r.providerName} (${r.modelName})`);

  const latencyData = {
    labels,
    datasets: [{
      label: 'Total Time (ms)',
      data: validResults.map(r => r.metrics!.finishTime - r.metrics!.startTime),
      backgroundColor: 'rgba(56, 189, 248, 0.7)', // Cyan
      borderColor: 'rgba(56, 189, 248, 1)',
      borderWidth: 1,
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
      backgroundColor: 'rgba(168, 85, 247, 0.7)', // Purple
      borderColor: 'rgba(168, 85, 247, 1)',
      borderWidth: 1,
    }],
  };

  return (
    <GlassCard className="p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-80">
        <div>
          <Bar options={{...chartOptions, plugins: {...chartOptions.plugins, title: {...chartOptions.plugins.title, text: 'Total Response Time (ms)'}}}} data={latencyData} />
        </div>
        <div>
          <Bar options={{...chartOptions, plugins: {...chartOptions.plugins, title: {...chartOptions.plugins.title, text: 'Tokens per Second (TPS)'}}}} data={tpsData} />
        </div>
      </div>
    </GlassCard>
  );
};

export default ComparisonCharts;
