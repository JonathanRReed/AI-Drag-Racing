import React, { useReducer, useCallback, useState, useRef, useEffect, useMemo } from 'react';
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
import { LaneBuffer, createLaneBuffer, pushChunk } from '../utils/raceBuffers';
import { getProviderColor } from '../utils/providerColors';
import { getProviderById } from '../utils/providers';
import type { PaceLane } from '../components/main/LivePaceChart';

const ResultsDisplay = dynamic(() => import('../components/main/ResultsDisplay'), { ssr: false });
const Leaderboard = dynamic(() => import('../components/main/Leaderboard'), { ssr: false });
const ComparisonCharts = dynamic(() => import('../components/ComparisonCharts'), { ssr: false });
const LivePaceChart = dynamic(() => import('../components/main/LivePaceChart'), { ssr: false });
const DragStrip = dynamic(() => import('../components/main/DragStrip'), { ssr: false });
const StandingsTicker = dynamic(() => import('../components/main/StandingsTicker'), { ssr: false });
const WinnerPodium = dynamic(() => import('../components/main/WinnerPodium'), { ssr: false });

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
  | { type: 'COMMIT_TEXT'; payload: Record<string, string> }
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
    case 'COMMIT_TEXT': {
      // Batched, throttled append of streamed text deltas (off the per-token hot path).
      const deltas = action.payload;
      return {
        ...state,
        results: state.results.map(r =>
          deltas[r.id] ? { ...r, responseText: r.responseText + deltas[r.id] } : r
        ),
      };
    }
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

// --- Demo race (a separate "test" — lets visitors without API keys watch the viz run) ---
// Real provider IDs so colors/logos resolve; the "· demo" suffix marks them as simulated.
const DEMO_LANES: { providerId: string; modelId: string; ttft: number; cps: number; total: number }[] = [
  { providerId: 'cerebras', modelId: 'llama-3.1-8b · demo', ttft: 190, cps: 820, total: 1300 },
  { providerId: 'groq', modelId: 'llama-3.3-70b · demo', ttft: 250, cps: 680, total: 1450 },
  { providerId: 'openai', modelId: 'gpt-4o-mini · demo', ttft: 520, cps: 360, total: 1250 },
  { providerId: 'anthropic', modelId: 'claude-haiku · demo', ttft: 640, cps: 320, total: 1600 },
];
const DEMO_SAMPLE =
  "Here's the quick read on inference speed. Three things matter: how fast the first token arrives, how steadily the model streams after that, and how much it ultimately produces. A model can launch quickly yet stream slowly, or start late and then sprint to the line. Watching them race side by side makes those trade-offs obvious in a way a single number never could. ";
const DEMO_LONG = DEMO_SAMPLE.repeat(10);

// --- Main Component ---

export default function Home() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [activeTab, setActiveTab] = useState<'results' | 'charts'>('results');
  const [hideFailed, setHideFailed] = useState(false);
  const [force, setForce] = useState<{ version: number; collapsed: boolean }>({ version: 0, collapsed: false });

  // --- Live race engine (off the React commit path) ---
  const goTimeRef = useRef<number>(0);
  const laneBuffersRef = useRef<Record<string, LaneBuffer>>({});
  const pendingTextRef = useRef<Record<string, string>>({});
  const flushTimerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [reducedMotion, setReducedMotion] = useState(false);
  const [normalize, setNormalize] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [raceView, setRaceView] = useState<'strip' | 'telemetry'>('strip');

  // Cleanup on unmount: clear the flush timer and cancel any in-flight streams.
  useEffect(() => {
    return () => {
      if (flushTimerRef.current != null) clearInterval(flushTimerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    if (flushTimerRef.current != null) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    laneBuffersRef.current = {};
    pendingTextRef.current = {};
    setAnnouncement('');
    dispatch({ type: 'RESET_RACE' });
  }, []);

  // Per-lane meta for the pace chart + standings. Keyed on a stable signature (ids +
  // providers + models) so streamed-text commits don't churn the array identity and force
  // the chart/strip to re-render mid-race.
  const laneSig = state.results.map((r) => `${r.id}:${r.providerName}`).join('|');
  const paceLanes = useMemo<PaceLane[]>(
    () =>
      state.results.map((r) => ({
        id: r.id,
        label: getProviderById(r.providerName)?.displayName || r.providerName,
        sublabel: r.modelName,
        color: getProviderColor(r.providerName).solid,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [laneSig]
  );
  const showStage =
    state.results.length > 0 && (state.raceState === 'racing' || state.raceState === 'finished');

  const startDisabled =
    !state.selectedPairs.some(
      (p) => state.enabledProviders[p.providerId] !== false && !!state.apiKeys[p.providerId] && !!p.modelId
    ) || state.raceState === 'countingDown' || state.raceState === 'racing';

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
    // Cancel any prior in-flight streams and open a fresh abort scope for this race.
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    // Reset the live race engine, then stage lanes before the countdown.
    const initialBuffers: Record<string, LaneBuffer> = {};
    for (const p of providersToTest) {
      const id = `${p.providerId}-${p.modelId}`;
      initialBuffers[id] = createLaneBuffer(id);
    }
    laneBuffersRef.current = initialBuffers;
    pendingTextRef.current = {};
    dispatch({ type: 'START_COMPARISON', payload: { providersToTest } });

    // Throttled committer: streamed text lands in refs on the hot path and is flushed to
    // React state ~11x/sec, so we never re-render the whole results array per token.
    const flushLane = (id: string) => {
      const t = pendingTextRef.current[id];
      if (t) {
        delete pendingTextRef.current[id];
        dispatch({ type: 'COMMIT_TEXT', payload: { [id]: t } });
      }
    };
    const startFlush = () => {
      if (flushTimerRef.current != null) return;
      flushTimerRef.current = window.setInterval(() => {
        const pending = pendingTextRef.current;
        if (Object.keys(pending).length) {
          pendingTextRef.current = {};
          dispatch({ type: 'COMMIT_TEXT', payload: pending });
        }
      }, 90);
    };
    const stopFlush = () => {
      if (flushTimerRef.current != null) {
        clearInterval(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };

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
    // Single shared "Go!" instant — the fair cross-model baseline for the pace chart.
    goTimeRef.current = performance.now();
    setAnnouncement(
      `Race started. ${providersToTest.length} ${providersToTest.length === 1 ? 'model' : 'models'} launching.`
    );
    startFlush();

    await Promise.all(
      providersToTest.map(async (p) => {
        const resultId = `${p.providerId}-${p.modelId}`;
        const apiKey = state.apiKeys[p.providerId];
        if (!apiKey) {
          const buf = laneBuffersRef.current[resultId];
          if (buf) { buf.errored = true; buf.done = true; }
          dispatch({ type: 'SET_ERROR', payload: { resultId, error: 'API Key not set' } });
          return;
        }
        try {
          // Clone settings and remove reasoningEffort if this model was excluded (toggled off)
          const effectiveSettings = { ...modelSettings };
          if (state.raceConfig.excludedReasoningModels?.includes(p.modelId)) {
            effectiveSettings.reasoningEffort = undefined;
          }

          const stream = streamCompletion(p.providerId, state.prompt, p.modelId, apiKey, effectiveSettings, signal);
          let sawMetrics = false;
          let tokenCount = 0;

          for await (const result of stream) {
            if (result.type === 'chunk') {
              tokenCount++;
              const tNow = performance.now() - goTimeRef.current;
              const buf = laneBuffersRef.current[resultId];
              if (buf) pushChunk(buf, result.content, tNow);
              pendingTextRef.current[resultId] = (pendingTextRef.current[resultId] || '') + result.content;
              // Enforce race-mode limits AFTER recording the chunk, and only on chunks — so
              // we never break before consuming the final metrics event.
              if (mode === 'token_limit' && tokenLimit && tokenCount >= tokenLimit) break;
              if (mode === 'time_limit' && timeLimit && (Date.now() - raceStartTime) / 1000 >= timeLimit) break;
            } else if (result.type === 'metrics') {
              const buf = laneBuffersRef.current[resultId];
              if (buf) {
                buf.done = true;
                buf.finalOutputTokens =
                  typeof result.data.outputTokens === 'number' ? result.data.outputTokens : null;
              }
              flushLane(resultId);
              dispatch({ type: 'FINISH_STREAM', payload: { resultId, metrics: result.data } });
              setAnnouncement(`${getProviderById(p.providerId)?.displayName || p.providerId} finished.`);
              sawMetrics = true;
            }
          }
          // If the stream closed without emitting metrics (e.g., due to limits), create synthetic metrics
          if (!sawMetrics) {
            if (mode === 'token_limit' || mode === 'time_limit') {
              // For limited races, synthesize metrics from what we collected — but use the
              // REAL client-observed first-token time instead of a hardcoded +100ms.
              const finishTime = Date.now();
              const buf = laneBuffersRef.current[resultId];
              if (buf) buf.done = true;
              flushLane(resultId);
              dispatch({
                type: 'FINISH_STREAM',
                payload: {
                  resultId,
                  metrics: {
                    startTime: raceStartTime,
                    // Real client-observed first token — or omit entirely if the model never
                    // streamed one, so it can't win Pole with a fake 0ms TTFT.
                    firstTokenTime:
                      buf && buf.firstTokenT != null ? raceStartTime + Math.round(buf.firstTokenT) : undefined,
                    finishTime,
                    tokenCount,
                    outputTokens: tokenCount,
                  },
                },
              });
              setAnnouncement(`${getProviderById(p.providerId)?.displayName || p.providerId} finished.`);
            } else {
              const buf = laneBuffersRef.current[resultId];
              if (buf) { buf.errored = true; buf.done = true; }
              flushLane(resultId);
              dispatch({ type: 'SET_ERROR', payload: { resultId, error: 'Stream ended without metrics' } });
            }
          }
        } catch (e: any) {
          const buf = laneBuffersRef.current[resultId];
          if (buf) { buf.errored = true; buf.done = true; }
          flushLane(resultId);
          dispatch({ type: 'SET_ERROR', payload: { resultId, error: e.message } });
        }
      })
    );
    // Final flush + stop the throttled committer so the transcripts are complete.
    stopFlush();
    const remaining = pendingTextRef.current;
    if (Object.keys(remaining).length) {
      pendingTextRef.current = {};
      dispatch({ type: 'COMMIT_TEXT', payload: remaining });
    }
    setAnnouncement('Race finished. The Winner’s Circle is ready below the pace chart.');
    dispatch({ type: 'FINISH_COMPARISON' });
  }, [state.prompt, state.apiKeys, state.selectedPairs, state.enabledProviders, state.raceConfig]);

  // Simulated test race — no API keys, no network. Drives the exact same render path
  // (buffers, countdown, podium) with synthetic streams so the visualization can be tried.
  const handleRunDemo = useCallback(async () => {
    if (state.raceState === 'racing' || state.raceState === 'countingDown') return;
    const pairs = DEMO_LANES.map((d) => ({ providerId: d.providerId, modelId: d.modelId }));
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    const initialBuffers: Record<string, LaneBuffer> = {};
    for (const p of pairs) {
      const id = `${p.providerId}-${p.modelId}`;
      initialBuffers[id] = createLaneBuffer(id);
    }
    laneBuffersRef.current = initialBuffers;
    pendingTextRef.current = {};
    dispatch({ type: 'START_COMPARISON', payload: { providersToTest: pairs } });

    const flushLane = (id: string) => {
      const t = pendingTextRef.current[id];
      if (t) {
        delete pendingTextRef.current[id];
        dispatch({ type: 'COMMIT_TEXT', payload: { [id]: t } });
      }
    };
    const startFlush = () => {
      if (flushTimerRef.current != null) return;
      flushTimerRef.current = window.setInterval(() => {
        const pending = pendingTextRef.current;
        if (Object.keys(pending).length) {
          pendingTextRef.current = {};
          dispatch({ type: 'COMMIT_TEXT', payload: pending });
        }
      }, 90);
    };
    const stopFlush = () => {
      if (flushTimerRef.current != null) {
        clearInterval(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };

    const reduceMotion =
      typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
    if (reduceMotion) {
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

    const raceStartTime = Date.now();
    goTimeRef.current = performance.now();
    setAnnouncement('Demo race started. 4 simulated models launching.');
    startFlush();

    await Promise.all(
      DEMO_LANES.map(async (d) => {
        const resultId = `${d.providerId}-${d.modelId}`;
        try {
          await delay(d.ttft);
          const perTick = Math.max(2, Math.round(d.cps * 0.08));
          let produced = 0;
          while (produced < d.total) {
            if (signal.aborted) throw new Error('aborted');
            const take = Math.min(perTick, d.total - produced);
            const start = produced % DEMO_LONG.length;
            let text = DEMO_LONG.slice(start, start + take);
            if (text.length < take) text += DEMO_LONG.slice(0, take - text.length);
            produced += take;
            const tNow = performance.now() - goTimeRef.current;
            const buf = laneBuffersRef.current[resultId];
            if (buf) pushChunk(buf, text, tNow);
            pendingTextRef.current[resultId] = (pendingTextRef.current[resultId] || '') + text;
            await delay(70 + Math.random() * 50);
          }
          const finishTime = Date.now();
          const buf = laneBuffersRef.current[resultId];
          if (buf) {
            buf.done = true;
            buf.finalOutputTokens = Math.round(d.total / 4);
          }
          flushLane(resultId);
          dispatch({
            type: 'FINISH_STREAM',
            payload: {
              resultId,
              metrics: {
                startTime: raceStartTime,
                firstTokenTime: raceStartTime + d.ttft,
                finishTime,
                tokenCount: Math.round(d.total / 4),
                outputTokens: Math.round(d.total / 4),
              },
            },
          });
          setAnnouncement(`${getProviderById(d.providerId)?.displayName || d.providerId} finished.`);
        } catch {
          const buf = laneBuffersRef.current[resultId];
          if (buf) {
            buf.errored = true;
            buf.done = true;
          }
          flushLane(resultId);
        }
      })
    );
    if (signal.aborted) return;
    stopFlush();
    const remaining = pendingTextRef.current;
    if (Object.keys(remaining).length) {
      pendingTextRef.current = {};
      dispatch({ type: 'COMMIT_TEXT', payload: remaining });
    }
    setAnnouncement('Demo race finished. The Winner’s Circle is ready below.');
    dispatch({ type: 'FINISH_COMPARISON' });
  }, [state.raceState]);

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
              onReset={handleReset}
              disabled={
                !state.selectedPairs.some(
                  (p) => state.enabledProviders[p.providerId] !== false && !!state.apiKeys[p.providerId] && !!p.modelId
                ) || state.raceState === 'countingDown' || state.raceState === 'racing'
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
              start quickly but still stream slowly after the first token appears. The live pace chart plots
              characters streamed against a shared client clock, so the curve faithfully reflects what your browser
              received; chunk boundaries and edge-network timing vary by provider. Token counts are estimated from
              output length (about four characters per token) except where a provider reports exact usage, so treat
              them as approximate.
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
                  onClick={handleReset}
                  className="race-reset-button press-scale"
                  disabled={state.isLoading || state.raceState === 'countingDown'}
                >
                  Reset
                </button>
                <button
                  onClick={handleRunDemo}
                  className="race-tool-button hidden sm:inline-flex"
                  disabled={state.raceState === 'racing' || state.raceState === 'countingDown'}
                  title="Run a simulated test race — no API key needed"
                >
                  <span className="inline-flex items-center gap-1">
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 3h6M10 3v6l-5.5 9.2A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.8L14 9V3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Demo
                  </span>
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
          {/* Live race announcements for assistive technology */}
          <div className="sr-only" role="status" aria-live="polite">{announcement}</div>

          {/* Content */}
          {activeTab === 'results' && (
            <>
              {showStage && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <GlassCard className="p-4" spotlight={false}>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {/* Strip (arcade) vs Telemetry (pace chart) view toggle */}
                        <div className="inline-flex overflow-hidden rounded-[12px] ring-1 ring-white/10" role="group" aria-label="Race view">
                          <button
                            type="button"
                            onClick={() => setRaceView('strip')}
                            aria-pressed={raceView === 'strip'}
                            className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${raceView === 'strip' ? 'bg-white/[0.12] text-white' : 'bg-white/[0.03] text-[var(--text-muted)] hover:bg-white/[0.08]'}`}
                          >
                            <span aria-hidden>🏁 </span>Strip
                          </button>
                          <button
                            type="button"
                            onClick={() => setRaceView('telemetry')}
                            aria-pressed={raceView === 'telemetry'}
                            className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${raceView === 'telemetry' ? 'bg-white/[0.12] text-white' : 'bg-white/[0.03] text-[var(--text-muted)] hover:bg-white/[0.08]'}`}
                          >
                            Telemetry
                          </button>
                        </div>
                        {state.raceState === 'racing' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-light)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-light)] animate-pulse" />
                            Live
                          </span>
                        )}
                      </div>
                      {raceView === 'telemetry' && (
                        <div className="flex items-center gap-3">
                          <span className="hidden text-[10px] text-[var(--text-muted)] sm:inline">
                            X: seconds since Go · Y: characters streamed
                          </span>
                          <button
                            type="button"
                            onClick={() => setNormalize((v) => !v)}
                            aria-pressed={normalize}
                            className="btn-ghost text-[11px]"
                            title="Toggle the Y scale between absolute characters and percent of the most output so far"
                          >
                            {normalize ? 'Scale: % of most output' : 'Scale: absolute'}
                          </button>
                        </div>
                      )}
                    </div>
                    {raceView === 'strip' ? (
                      <DragStrip
                        lanes={paceLanes}
                        buffersRef={laneBuffersRef}
                        goTimeRef={goTimeRef}
                        running={state.raceState === 'racing'}
                        reducedMotion={reducedMotion}
                      />
                    ) : (
                      <>
                        <LivePaceChart
                          lanes={paceLanes}
                          buffersRef={laneBuffersRef}
                          goTimeRef={goTimeRef}
                          running={state.raceState === 'racing'}
                          reducedMotion={reducedMotion}
                          normalize={normalize}
                        />
                        <div className="mt-2 flex max-h-[68px] flex-wrap gap-x-4 gap-y-1 overflow-y-auto scrollbar-none">
                          {paceLanes.map((l) => (
                            <span key={l.id} className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                              <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
                              <span className="max-w-[160px] truncate" title={`${l.label} — ${l.sublabel}`}>
                                {l.label}
                              </span>
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </GlassCard>
                  <GlassCard className="flex flex-col p-3" spotlight={false}>
                    <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Standings
                    </h3>
                    <StandingsTicker
                      lanes={paceLanes}
                      buffersRef={laneBuffersRef}
                      running={state.raceState === 'racing'}
                      reducedMotion={reducedMotion}
                    />
                  </GlassCard>
                </div>
              )}
              {state.raceState === 'finished' && (
                <WinnerPodium results={state.results} mode={state.raceConfig.mode} reducedMotion={reducedMotion} />
              )}
              <ResultsDisplay results={state.results} hideFailed={hideFailed} force={force} compact={showStage} onDemo={handleRunDemo} />
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
