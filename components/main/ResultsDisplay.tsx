// components/main/ResultsDisplay.tsx
import React, { useMemo } from 'react';
import RaceLane from './RaceLane';
import GlassCard from '../layout/GlassCard';
import { CompletionMetrics } from '../../utils/providerService';
import { getProviderColor } from '../../utils/providerColors';
import type { BrowserTiming } from '../../utils/raceReceipts';

export interface ResultState {
  id: string; // A unique ID for this result, e.g., providerId-modelName
  providerName: string;
  modelName: string;
  responseText: string;
  metrics: CompletionMetrics | null;
  isLoading: boolean;
  error: string | null;
  browserTiming: BrowserTiming | null;
  edgeRegion: string | null;
}

interface ResultsDisplayProps {
  results: ResultState[];
  hideFailed?: boolean;
  force?: { version: number; collapsed: boolean };
  // When the pace chart leads the layout, lanes start collapsed as readable drawers.
  compact?: boolean;
  // Optional: run the simulated test race (shown in the empty state for keyless visitors).
  onDemo?: () => void;
  // Lanes already staged on the strip. Setup steps are done, so the empty state gets out of the way.
  stagedCount?: number;
}

const STEPS = [
  { n: 1, text: 'Open Racers: the rail on the left, or the Racers button on a phone.' },
  { n: 2, text: 'Add an API key for a provider. It lasts only for this tab.' },
  { n: 3, text: 'Pick one or more models. Each one takes a lane on the strip.' },
  { n: 4, text: 'Press Start race and watch them stream side by side.' },
];

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results, hideFailed = false, force, compact = false, onDemo, stagedCount = 0 }) => {
  // Memoize displayed results to avoid creating new array allocations on parent re-renders.
  const displayed = useMemo(
    () => (hideFailed ? results.filter((r) => !r.error) : results),
    [hideFailed, results]
  );

  if (results.length === 0 && stagedCount > 0) {
    return (
      <p className="lineup-ready">
        <strong>{stagedCount} {stagedCount === 1 ? 'lane is' : 'lanes are'} staged.</strong> Press Start race, or
        press Enter in the prompt. Each model's response appears here as it streams.
      </p>
    );
  }

  if (results.length === 0) {
    return (
      <GlassCard className="lineup" hover={false} spotlight={false}>
        <div className="lineup-copy">
          <h2>Line up your racers</h2>
          <p>
            Add a provider in the Racers panel, choose your models, and start a live race. Keys stay in this tab
            and go only to the provider you pick.
          </p>
          {onDemo && (
            <p className="lineup-demo">
              <button type="button" onClick={onDemo} className="btn-secondary">
                Watch a demo race
              </button>
              <span>Simulated, no API key.</span>
            </p>
          )}
        </div>
        <ol className="lineup-steps">
          {STEPS.map((s) => (
            <li key={s.n}>
              <span aria-hidden="true">{s.n}</span>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </GlassCard>
    );
  }

  return (
    <div className="lane-grid">
      {displayed.map((result) => (
        <RaceLane
          key={result.id}
          providerName={result.providerName}
          modelName={result.modelName}
          responseText={result.responseText}
          metrics={result.metrics}
          isLoading={result.isLoading}
          error={result.error}
          laneColor={getProviderColor(result.providerName).solid}
          force={force}
          initialExpanded={!compact}
        />
      ))}
    </div>
  );
};

// Memoize ResultsDisplay to skip reconciliation of the results grid during high-frequency
// parent state updates (e.g. state changes in Home outside of results array updates).
export default React.memo(ResultsDisplay);
