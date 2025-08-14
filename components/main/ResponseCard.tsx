// components/main/ResponseCard.tsx
import React from 'react';
import { CompletionMetrics } from '../../utils/providerService';
import GlassCard from '../layout/GlassCard';

interface ResponseCardProps {
  providerName: string;
  modelName: string;
  responseText: string;
  metrics: CompletionMetrics | null;
  isLoading: boolean;
  error: string | null;
}

const ResponseCard: React.FC<ResponseCardProps> = ({
  providerName,
  modelName,
  responseText,
  metrics,
  isLoading,
  error,
}) => {
  const formatLatency = (ms: number | undefined) => (ms ? `${ms.toFixed(0)} ms` : 'N/A');

  const calculateTps = () => {
    if (!metrics || !metrics.finishTime || !metrics.firstTokenTime) return 'N/A';
    const durationInSeconds = (metrics.finishTime - metrics.firstTokenTime) / 1000;
    if (durationInSeconds <= 0) return 'N/A';
    return (metrics.tokenCount / durationInSeconds).toFixed(2);
  };

  return (
    <GlassCard className="p-4 flex flex-col h-full">
      <div className="flex items-center mb-2">
        <h3 className="text-lg font-semibold text-white">{providerName}</h3>
        <p className="text-sm text-gray-400 ml-2">({modelName})</p>
      </div>
      <div className="flex-grow overflow-y-auto pr-2">
        {isLoading && <p className="text-gray-400">Waiting for response...</p>}
        {error && <p className="text-red-400">Error: {error}</p>}
        <p className="whitespace-pre-wrap text-gray-200">{responseText}</p>
      </div>
      {metrics && (
        <div className="mt-4 pt-2 border-t border-white/10 text-xs text-gray-400 grid grid-cols-3 gap-2">
          <div>
            <span className="font-semibold">TTFT:</span>{' '}
            {formatLatency(metrics.firstTokenTime ? metrics.firstTokenTime - metrics.startTime : undefined)}
          </div>
          <div>
            <span className="font-semibold">Total Time:</span>{' '}
            {formatLatency(metrics.finishTime - metrics.startTime)}
          </div>
          <div>
            <span className="font-semibold">Tokens/sec:</span> {calculateTps()}
          </div>
        </div>
      )}
    </GlassCard>
  );
};

export default ResponseCard;
