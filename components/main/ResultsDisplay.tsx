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
  // When the pace chart leads the layout, lanes start collapsed as readable drawers.
  compact?: boolean;
  // Optional: run the simulated test race (shown in the empty state for keyless visitors).
  onDemo?: () => void;
}

const STEPS = [
  { n: 1, text: 'Open the Racers panel — the sidebar on the left, or tap Racers on mobile.' },
  { n: 2, text: 'Paste an API key for any provider (stored only in your browser).' },
  { n: 3, text: 'Pick one or more models to enter the race.' },
  { n: 4, text: 'Hit Start Race and watch them stream head-to-head.' },
];

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results, hideFailed = false, force, compact = false, onDemo }) => {
  if (results.length === 0) {
    return (
      <GlassCard className="px-6 py-12" spotlight={false}>
        <div className="mx-auto flex max-w-lg flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-zinc-950 ring-1 ring-white/10">
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-[var(--accent-light)]" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 3v18h2v-7h12V3H5zm2 2h8v3H7V5zm0 5h10v2H7v-2z" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-white heading-tight">Line up your racers</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">
            Add a provider in the <span className="font-medium text-[var(--text)]">Racers</span> panel, choose your models,
            and start a live head-to-head speed test.
          </p>

          <ol className="mt-6 w-full space-y-2.5 text-left">
            {STEPS.map((s) => (
              <li key={s.n} className="flex items-start gap-3">
                <span className="font-speed mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-muted)] text-xs text-[var(--accent-light)]">
                  {s.n}
                </span>
                <span className="text-sm text-[var(--text-secondary)]">{s.text}</span>
              </li>
            ))}
          </ol>

          {onDemo && (
            <div className="mt-7 flex flex-col items-center gap-1.5 border-t border-white/5 pt-5">
              <button onClick={onDemo} className="btn-secondary text-xs">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 3h6M10 3v6l-5.5 9.2A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.8L14 9V3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Watch a demo race
              </button>
              <span className="text-[11px] text-[var(--text-subtle)]">Simulated — no API key, just to see how it looks</span>
            </div>
          )}
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
            initialExpanded={!compact}
          />
        </div>
      ))}
    </div>
  );
};

export default ResultsDisplay;
