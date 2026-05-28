import React, { useReducer, useCallback, useState } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import MainLayout from '../components/layout/MainLayout';
import ProviderList from '../components/sidebar/ProviderList';
import PromptInput from '../components/main/PromptInput';
import type { ResultState } from '../components/main/ResultsDisplay';
import { streamCompletion } from '../utils/apiClient';
import { CompletionMetrics } from '../utils/providerService';
import GlassCard from '../components/layout/GlassCard';
import CountdownOverlay from '../components/main/CountdownOverlay';
import RaceSettings, { RaceConfig } from '../components/sidebar/RaceSettings';

const ResultsDisplay = dynamic(() => import('../components/main/ResultsDisplay'), { ssr: false });
const Leaderboard = dynamic(() => import('../components/main/Leaderboard'), { ssr: false });
const ComparisonCharts = dynamic(() => import('../components/ComparisonCharts'), { ssr: false });

// --- State Management using useReducer ---

interface AppState {
  prompt: string;
  isLoading: boolean;
  apiKeys: Record<string, string>;
  selectedPairs: { providerId: string; modelId: string }[];
  results: ResultState[];
  raceState: 'idle' | 'countingDown' | 'racing' | 'finished';
  countdownValue: number | 'Go!' | null;
  enabledProviders: Record<string, boolean>;
  raceConfig: RaceConfig;
}

type AppAction =
  | { type: 'SET_PROMPT'; payload: string }
  | { type: 'SET_API_KEY'; payload: { providerId: string; apiKey: string } }
  | { type: 'TOGGLE_MODEL_SELECTION'; payload: { providerId: string; modelId: string } }
  | { type: 'CLEAR_PROVIDER_SELECTIONS'; payload: { providerId: string } }
  | { type: 'START_COMPARISON'; payload: { providersToTest: { providerId: string; modelId: string }[] } }
  | { type: 'RECEIVE_CHUNK'; payload: { resultId: string; chunk: string } }
  | { type: 'FINISH_STREAM'; payload: { resultId: string; metrics: CompletionMetrics } }
  | { type: 'SET_ERROR'; payload: { resultId: string; error: string } }
  | { type: 'FINISH_COMPARISON' }
  | { type: 'SET_RACE_STATE'; payload: AppState['raceState'] }
  | { type: 'SET_COUNTDOWN'; payload: AppState['countdownValue'] }
  | { type: 'SET_PROVIDER_ENABLED'; payload: { providerId: string; enabled: boolean } }
  | { type: 'RESET_RACE' }
  | { type: 'SET_RACE_CONFIG'; payload: RaceConfig };

const initialState: AppState = {
  prompt: 'Write a short story about a robot who discovers music.',
  isLoading: false,
  apiKeys: {},
  selectedPairs: [],
  results: [],
  raceState: 'idle',
  countdownValue: null,
  enabledProviders: {},
  raceConfig: {
    mode: 'drag',
    tokenLimit: 500,
    timeLimit: 30,
    modelSettings: {
      temperature: 0.7,
      maxTokens: 2048,
      topP: 1.0,
    },
  },
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_PROMPT':
      return { ...state, prompt: action.payload };
    case 'SET_API_KEY':
      return { ...state, apiKeys: { ...state.apiKeys, [action.payload.providerId]: action.payload.apiKey } };
    case 'TOGGLE_MODEL_SELECTION': {
      const { providerId, modelId } = action.payload;
      const exists = state.selectedPairs.some(p => p.providerId === providerId && p.modelId === modelId);
      const next = exists
        ? state.selectedPairs.filter(p => !(p.providerId === providerId && p.modelId === modelId))
        : [...state.selectedPairs, { providerId, modelId }];
      return { ...state, selectedPairs: next };
    }
    case 'CLEAR_PROVIDER_SELECTIONS': {
      const { providerId } = action.payload;
      return { ...state, selectedPairs: state.selectedPairs.filter(p => p.providerId !== providerId) };
    }
    case 'START_COMPARISON':
      return {
        ...state,
        isLoading: true,
        results: action.payload.providersToTest.map(p => ({
          id: `${p.providerId}-${p.modelId}`,
          providerName: p.providerId,
          modelName: p.modelId,
          responseText: '',
          metrics: null,
          isLoading: true,
          error: null,
        })),
      };
    case 'RECEIVE_CHUNK':
      return {
        ...state,
        results: state.results.map(r =>
          r.id === action.payload.resultId
            ? { ...r, responseText: r.responseText + action.payload.chunk }
            : r
        ),
      };
    case 'FINISH_STREAM':
      return {
        ...state,
        results: state.results.map(r =>
          r.id === action.payload.resultId
            ? { ...r, isLoading: false, metrics: action.payload.metrics }
            : r
        ),
      };
    case 'SET_ERROR':
      return {
        ...state,
        results: state.results.map(r =>
          r.id === action.payload.resultId
            ? { ...r, isLoading: false, error: action.payload.error }
            : r
        ),
      };
    case 'FINISH_COMPARISON':
      return { ...state, isLoading: false, raceState: 'finished', countdownValue: null };
    case 'RESET_RACE':
      return { ...state, isLoading: false, results: [], raceState: 'idle', countdownValue: null };
    case 'SET_RACE_STATE':
      return { ...state, raceState: action.payload };
    case 'SET_COUNTDOWN':
      return { ...state, countdownValue: action.payload };
    case 'SET_PROVIDER_ENABLED':
      return {
        ...state,
        enabledProviders: { ...state.enabledProviders, [action.payload.providerId]: action.payload.enabled },
      };
    case 'SET_RACE_CONFIG':
      return { ...state, raceConfig: action.payload };
    default:
      return state;
  }
}

// --- Main Component ---

export default function Home() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [activeTab, setActiveTab] = useState<'results' | 'charts'>('results');
  const [hideFailed, setHideFailed] = useState(false);
  const [force, setForce] = useState<{ version: number; collapsed: boolean }>({ version: 0, collapsed: false });
  const startDisabled =
    !state.selectedPairs.some(
      (p) => state.enabledProviders[p.providerId] !== false && !!state.apiKeys[p.providerId] && !!p.modelId
    ) || state.raceState === 'countingDown';

  const handleRunComparison = useCallback(async () => {
    // If the user selected specific provider+model pairs, use those.
    // Otherwise fallback to the default two for convenience.
    const selected = state.selectedPairs.filter(
      (p) => state.enabledProviders[p.providerId] !== false
    );
    if (selected.length === 0) {
      // Nothing eligible; do nothing (button should be disabled already)
      return;
    }
    const providersToTest = selected;
    // Stage lanes first so users see lanes before the countdown
    dispatch({ type: 'START_COMPARISON', payload: { providersToTest } });

    // Respect reduced motion
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
    if (reduceMotion) {
      // Skip countdown for accessibility
      dispatch({ type: 'SET_RACE_STATE', payload: 'racing' });
      dispatch({ type: 'SET_COUNTDOWN', payload: null });
    } else {
      dispatch({ type: 'SET_RACE_STATE', payload: 'countingDown' });
      for (const val of [3, 2, 1] as const) {
        dispatch({ type: 'SET_COUNTDOWN', payload: val });
        await delay(700);
      }
      dispatch({ type: 'SET_COUNTDOWN', payload: 'Go!' });
      await delay(300);
      dispatch({ type: 'SET_RACE_STATE', payload: 'racing' });
      dispatch({ type: 'SET_COUNTDOWN', payload: null });
    }
    // Get race config and prepare settings
    const { mode, tokenLimit, timeLimit, modelSettings } = state.raceConfig;
    const raceStartTime = Date.now();

    await Promise.all(
      providersToTest.map(async (p) => {
        const resultId = `${p.providerId}-${p.modelId}`;
        const apiKey = state.apiKeys[p.providerId];
        if (!apiKey) {
          dispatch({ type: 'SET_ERROR', payload: { resultId, error: 'API Key not set' } });
          return;
        }
        try {
          // Clone settings and remove reasoningEffort if this model was excluded (toggled off)
          const effectiveSettings = { ...modelSettings };
          if (state.raceConfig.excludedReasoningModels?.includes(p.modelId)) {
            effectiveSettings.reasoningEffort = undefined;
          }

          const stream = streamCompletion(p.providerId, state.prompt, p.modelId, apiKey, effectiveSettings);
          let sawMetrics = false;
          let tokenCount = 0;

          for await (const result of stream) {
            // Check race mode limits
            if (mode === 'token_limit' && tokenLimit && tokenCount >= tokenLimit) {
              // Token limit reached - finish early
              break;
            }
            if (mode === 'time_limit' && timeLimit) {
              const elapsed = (Date.now() - raceStartTime) / 1000;
              if (elapsed >= timeLimit) {
                // Time limit reached - finish early
                break;
              }
            }

            if (result.type === 'chunk') {
              tokenCount++;
              dispatch({ type: 'RECEIVE_CHUNK', payload: { resultId, chunk: result.content } });
            } else if (result.type === 'metrics') {
              dispatch({ type: 'FINISH_STREAM', payload: { resultId, metrics: result.data } });
              sawMetrics = true;
            }
          }
          // If the stream closed without emitting metrics (e.g., due to limits), create synthetic metrics
          if (!sawMetrics) {
            if (mode === 'token_limit' || mode === 'time_limit') {
              // For limited races, we create metrics based on what we collected
              const finishTime = Date.now();
              dispatch({
                type: 'FINISH_STREAM',
                payload: {
                  resultId,
                  metrics: {
                    startTime: raceStartTime,
                    firstTokenTime: raceStartTime + 100, // approximate
                    finishTime,
                    tokenCount,
                    outputTokens: tokenCount,
                  },
                },
              });
            } else {
              dispatch({ type: 'SET_ERROR', payload: { resultId, error: 'Stream ended without metrics' } });
            }
          }
        } catch (e: any) {
          dispatch({ type: 'SET_ERROR', payload: { resultId, error: e.message } });
        }
      })
    );
    dispatch({ type: 'FINISH_COMPARISON' });
  }, [state.prompt, state.apiKeys, state.selectedPairs, state.enabledProviders, state.raceConfig]);

  return (
    <>
      <Head>
        <title>AI Drag Racing | LLM Speed Test</title>
        <meta name="description" content="Race AI models side by side, compare latency, time to first token, throughput, and output quality in a live browser benchmark by Jonathan R Reed." />

        {/* Canonical URL */}
        <link rel="canonical" href="https://ai-dragrace.jonathanrreed.com/" />

        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Jonathan R Reed" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#07090D" />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "AI Drag Racing",
              "description": "Race AI models side by side, compare latency, time to first token, throughput, and output quality in a live browser benchmark by Jonathan R Reed.",
              "url": "https://ai-dragrace.jonathanrreed.com/",
              "applicationCategory": "DeveloperApplication",
              "operatingSystem": "Any",
              "browserRequirements": "Requires JavaScript",
              "datePublished": "2026-04-21",
              "dateModified": "2026-04-21",
              "author": {
                "@type": "Person",
                "name": "Jonathan Reed",
                "alternateName": "Jonathan R Reed",
                "url": "https://jonathanrreed.com"
              },
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "5",
                "bestRating": "5",
                "worstRating": "1",
                "ratingCount": "1"
              }
            })
          }}
        />

        <link rel="icon" href="/Favicon/favicon.ico" sizes="any" />
      </Head>
      <MainLayout
        sidebar={
          <div className="flex h-full min-h-0 flex-col gap-3">
            {/* Small prompt card above models */}
            <PromptInput
              prompt={state.prompt}
              onPromptChange={(p) => dispatch({ type: 'SET_PROMPT', payload: p })}
              onSubmit={handleRunComparison}
              isLoading={state.isLoading || state.raceState === 'countingDown'}
              onReset={() => dispatch({ type: 'RESET_RACE' })}
              disabled={
                !state.selectedPairs.some(
                  (p) => state.enabledProviders[p.providerId] !== false && !!state.apiKeys[p.providerId] && !!p.modelId
                ) || state.raceState === 'countingDown'
              }
            />
            {/* Race Settings */}
            <RaceSettings
              config={state.raceConfig}
              onChange={(config) => dispatch({ type: 'SET_RACE_CONFIG', payload: config })}
              selectedPairs={state.selectedPairs}
            />
            <GlassCard className="p-3 w-full max-w-full flex-1 min-h-0 overflow-hidden">
              <ProviderList
                apiKeys={state.apiKeys}
                dispatch={dispatch}
                selectedPairs={state.selectedPairs}
              />
            </GlassCard>
          </div>
        }
      >
        {/* Hero intro copy */}
        <div className="race-hero-wrap">
          <div className="race-hero">
            {/* Top red accent line */}
            <div className="race-hero-accent" />
            <div className="race-hero-icon">
              <svg viewBox="0 0 24 24" className="race-hero-svg" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 4v4M12 16v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4 12h4M16 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="race-hero-copy">
              <h1 className="race-hero-title">
                AI Drag Racing
              </h1>
              <p className="sr-only">
                AI Drag Racing compares large language model latency, time to first token, streaming throughput, provider
                errors, prompt handling, and repeat-run consistency in a live browser benchmark for practical model
                evaluation.
              </p>
              <p className="race-hero-lead">
                A live benchmark experiment by{' '}
                <span className="text-zinc-200">Jonathan R Reed</span> that races AI models side by side so you can watch latency in real time.
              </p>
              <p className="race-hero-body">
                Use the same prompt and comparable settings when you want a fair read. The useful signal is not only who
                finishes first, but which model starts quickly, streams steadily, handles the task cleanly, and avoids
                provider errors during a real browser session.
              </p>
            </div>
          </div>
        </div>
        <details className="race-details">
          <summary className="race-details-summary">
            How to read an AI model race
          </summary>
          <div className="race-details-copy">
            <p>
              AI Drag Racing compares model behavior under the same prompt, selected settings, and local browser
              session. Time to first token shows how quickly a provider starts responding. Total response time shows
              how long the full answer takes. Tokens per second is useful for longer generations because a model can
              start quickly but still stream slowly after the first token appears.
            </p>
            <p>
              Treat every run as a live measurement, not a permanent leaderboard. Network route, provider load,
              regional availability, selected model, prompt length, reasoning settings, and output length all affect
              results. For a fair comparison, select comparable models, reuse the same prompt, run more than one race,
              and compare both the timing metrics and the actual answer quality.
            </p>
            <p>
              The app is built for practical evaluation work: checking which model feels fastest for coding prompts,
              support drafts, writing tasks, summarization, structured extraction, and agent workflows. It is also a
              useful way to spot provider errors, slow starts, rate-limit behavior, and models that look fast only
              because they produce shorter answers.
            </p>
            <p>
              Repeated runs matter. A single race can show a spike, but a few consistent runs reveal whether the delay
              comes from the provider, the model, the prompt shape, or the current network path.
            </p>
          </div>
        </details>
        <div className="space-y-4">
          {/* Tabs + actions toolbar (sticky on md+, static on mobile) */}
          <div className="race-toolbar-wrap">
            <div className="race-toolbar">
              {/* Tabs */}
              <div className="race-tabs">
                <button
                  onClick={() => setActiveTab('results')}
                  className={`race-tab ${activeTab === 'results' ? 'is-active' : ''}`}
                >
                  Results
                </button>
                <button
                  onClick={() => setActiveTab('charts')}
                  className={`race-tab ${activeTab === 'charts' ? 'is-active' : ''}`}
                  disabled={state.results.length === 0}
                >
                  Charts
                </button>
              </div>
              {/* Actions */}
              <div className="race-actions">
                {/* Primary controls available even when sidebar is closed on mobile */}
                <button
                  onClick={handleRunComparison}
                  className="race-start-button group press-scale"
                  disabled={startDisabled || !state.prompt}
                >
                  <span className="flex items-center gap-1.5">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="currentColor">
                      <path d="M5 3l14 9-14 9V3z" />
                    </svg>
                    START RACE
                  </span>
                </button>
                <button
                  onClick={() => dispatch({ type: 'RESET_RACE' })}
                  className="race-reset-button press-scale"
                  disabled={state.isLoading || state.raceState === 'countingDown'}
                >
                  Reset
                </button>
                <button
                  onClick={() => setHideFailed((v) => !v)}
                  className="race-tool-button"
                  disabled={activeTab !== 'results' || state.results.length === 0}
                >
                  {hideFailed ? 'Show failed' : 'Hide failed'}
                </button>
                <button
                  onClick={() => setForce((f) => ({ version: f.version + 1, collapsed: true }))}
                  className="race-tool-button"
                  disabled={activeTab !== 'results' || state.results.length === 0}
                >
                  Collapse all
                </button>
                <button
                  onClick={() => setForce((f) => ({ version: f.version + 1, collapsed: false }))}
                  className="race-tool-button"
                  disabled={activeTab !== 'results' || state.results.length === 0}
                >
                  Expand all
                </button>
              </div>
            </div>
          </div>
          {/* Content */}
          {activeTab === 'results' && (
            <>
              <ResultsDisplay results={state.results} hideFailed={hideFailed} force={force} />
              {state.results.length > 0 && <Leaderboard results={state.results} />}
            </>
          )}
          {activeTab === 'charts' && state.results.length > 0 && (
            <ComparisonCharts results={state.results} />
          )}
        </div>
      </MainLayout>
      {/* Countdown overlay */}
      <CountdownOverlay visible={state.raceState === 'countingDown'} value={state.countdownValue ?? 3} />
    </>
  );
}
