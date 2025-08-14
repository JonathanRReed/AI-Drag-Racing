// components/main/ResultsDisplay.tsx
import React from 'react';
import ResponseCard from './ResponseCard';
import { CompletionMetrics } from '../../utils/providerService';
import GlassCard from '../layout/GlassCard';

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
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results }) => {
  if (results.length === 0) {
    return (
      <GlassCard className="p-6 text-center text-gray-400">
        <p>Run a comparison to see results here.</p>
      </GlassCard>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {results.map((result) => (
        <ResponseCard
          key={result.id}
          providerName={result.providerName}
          modelName={result.modelName}
          responseText={result.responseText}
          metrics={result.metrics}
          isLoading={result.isLoading}
          error={result.error}
        />
      ))}
    </div>
  );
};

export default ResultsDisplay;
