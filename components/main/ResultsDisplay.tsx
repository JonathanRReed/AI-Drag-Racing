// components/main/ResultsDisplay.tsx
import React from 'react';
import RaceLane from './RaceLane';
import GlassCard from '../layout/GlassCard';
import { CompletionMetrics } from '../../utils/providerService';
import { getProviderColor } from '../../utils/providerColors';

export interface ResultState {
  id: string; // A unique ID for this result, e.g., providerId-modelName
  providerName: string;
  modelName: string;
  responseText: string;
  metrics: CompletionMetrics | null;
  isLoading: boolean;
  error: string | null;
}

interface ResultsDisplayProps {
  results: ResultState[];
  hideFailed?: boolean;
  force?: { version: number; collapsed: boolean };
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results, hideFailed = false, force }) => {
  if (results.length === 0) {
    return (
      <GlassCard className="py-16 px-8">
        <div className="flex flex-col items-center justify-center text-center">
          <p className="text-[var(--text-muted)]">
            Run a comparison to see results here.
          </p>
        </div>
      </GlassCard>
    );
  }

  const displayed = hideFailed
    ? results.filter(r => !r.error)
    : results;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {displayed.map((result, index) => (
        <div 
          key={result.id} 
          className="animate-fade-up opacity-0"
          style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'forwards' }}
        >
          <RaceLane
            providerName={result.providerName}
            modelName={result.modelName}
            responseText={result.responseText}
            metrics={result.metrics}
            isLoading={result.isLoading}
            error={result.error}
            laneColor={getProviderColor(result.providerName).solid}
            force={force}
          />
        </div>
      ))}
    </div>
  );
};

export default ResultsDisplay;
