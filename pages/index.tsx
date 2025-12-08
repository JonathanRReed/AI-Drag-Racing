import React, { useReducer, useCallback, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../components/layout/MainLayout';
import ProviderList from '../components/sidebar/ProviderList';
import PromptInput from '../components/main/PromptInput';
import ResultsDisplay, { ResultState } from '../components/main/ResultsDisplay';
import ComparisonCharts from '../components/ComparisonCharts';
import { streamCompletion } from '../utils/apiClient';
import { CompletionMetrics } from '../utils/providerService';
import GlassCard from '../components/layout/GlassCard';
import CountdownOverlay from '../components/main/CountdownOverlay';
import Leaderboard from '../components/main/Leaderboard';
import RaceSettings, { RaceConfig } from '../components/sidebar/RaceSettings';

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
          const stream = streamCompletion(p.providerId, state.prompt, p.modelId, apiKey, modelSettings);
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
        <title>AI Drag Racing - LLM Speed Benchmark | Jonathan Reed</title>
        <meta name="description" content="Race AI models head-to-head. Compare TTFT, throughput, and total time across OpenAI, Anthropic, Google, Groq, Cerebras and more." />

        {/* Canonical URL */}
        <link rel="canonical" href="https://ai-dragrace.jonathanrreed.com/" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://ai-dragrace.jonathanrreed.com/" />
        <meta property="og:title" content="AI Drag Racing - LLM Speed Benchmark | Jonathan Reed" />
        <meta property="og:description" content="Race AI models head-to-head. Compare TTFT, throughput, and total time across OpenAI, Anthropic, Google, Groq, Cerebras and more." />
        <meta property="og:image" content="https://ai-dragrace.jonathanrreed.com/og-image.png" />
        <meta property="og:site_name" content="AI Drag Racing" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://ai-dragrace.jonathanrreed.com/" />
        <meta name="twitter:title" content="AI Drag Racing - LLM Speed Benchmark | Jonathan Reed" />
        <meta name="twitter:description" content="Race AI models head-to-head. Compare TTFT, throughput, and total time across OpenAI, Anthropic, Google, Groq, Cerebras and more." />
        <meta name="twitter:image" content="https://ai-dragrace.jonathanrreed.com/og-image.png" />

        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <meta name="keywords" content="AI, LLM, model comparison, drag race, performance, TTFT, throughput, tokens per second, OpenAI, Anthropic, Claude, GPT, Gemini, Groq, Cerebras" />
        <meta name="author" content="Jonathan Reed" />
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
              "description": "Race AI models head-to-head. Compare TTFT, throughput, and total time across OpenAI, Anthropic, Google, Groq, Cerebras and more.",
              "url": "https://ai-dragrace.jonathanrreed.com/",
              "applicationCategory": "DeveloperApplication",
              "operatingSystem": "Any",
              "browserRequirements": "Requires JavaScript",
              "author": {
                "@type": "Person",
                "name": "Jonathan Reed",
                "url": "https://jonathanrreed.com"
              },
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              }
            })
          }}
        />

        <link rel="icon" type="image/svg+xml" href="/Favicon/favicon.svg" />
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
        <div className="space-y-4">
          {/* Tabs + actions toolbar (sticky on md+, static on mobile) */}
          <div className="md:sticky md:top-0 z-10 -mx-1">
            <div className="px-1 py-2 bg-[rgba(255,255,255,0.06)] ring-1 ring-white/10 backdrop-blur-xl rounded-[18px] overflow-hidden flex items-center justify-between">
              {/* Tabs */}
              <div className="inline-flex rounded-[18px] overflow-hidden ring-1 ring-white/10">
                <button
                  onClick={() => setActiveTab('results')}
                  className={`px-3 py-1.5 text-xs transition ${activeTab === 'results'
                      ? 'bg-[rgba(255,255,255,0.12)] text-white'
                      : 'bg-[rgba(255,255,255,0.06)] text-white/80 hover:bg-[rgba(255,255,255,0.10)]'
                    }`}
                >
                  Results
                </button>
                <button
                  onClick={() => setActiveTab('charts')}
                  className={`px-3 py-1.5 text-xs transition ${activeTab === 'charts'
                      ? 'bg-[rgba(255,255,255,0.12)] text-white'
                      : 'bg-[rgba(255,255,255,0.06)] text-white/80 hover:bg-[rgba(255,255,255,0.10)]'
                    }`}
                  disabled={state.results.length === 0}
                >
                  Charts
                </button>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* Primary controls available even when sidebar is closed on mobile */}
                <button
                  onClick={handleRunComparison}
                  className="btn btn-primary text-xs hidden sm:inline-flex group"
                  disabled={startDisabled || !state.prompt}
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-cyan-300 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Start
                </button>
                <button
                  onClick={() => dispatch({ type: 'RESET_RACE' })}
                  className="btn-ghost text-xs hidden sm:inline-flex"
                  disabled={state.isLoading || state.raceState === 'countingDown'}
                >
                  Reset
                </button>
                <button
                  onClick={() => setHideFailed((v) => !v)}
                  className="btn-ghost text-xs"
                  disabled={activeTab !== 'results' || state.results.length === 0}
                >
                  {hideFailed ? 'Show failed' : 'Hide failed'}
                </button>
                <button
                  onClick={() => setForce((f) => ({ version: f.version + 1, collapsed: true }))}
                  className="btn-ghost text-xs"
                  disabled={activeTab !== 'results' || state.results.length === 0}
                >
                  Collapse all
                </button>
                <button
                  onClick={() => setForce((f) => ({ version: f.version + 1, collapsed: false }))}
                  className="btn-ghost text-xs"
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


