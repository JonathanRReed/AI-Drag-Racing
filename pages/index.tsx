import React, { useReducer, useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { AUTHOR_PERSON, AUTHOR_REF } from '../lib/author';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import MainLayout from '../components/layout/MainLayout';
import ProviderList from '../components/sidebar/ProviderList';
import PromptInput from '../components/main/PromptInput';
import type { ResultState } from '../components/main/ResultsDisplay';
import { streamCompletion } from '../utils/apiClient';
import { createRaceDeadline, waitForRaceDelay } from '../utils/raceDeadline';
import { CompletionMetrics } from '../utils/providerService';
import CountdownOverlay from '../components/main/CountdownOverlay';
import RaceSettings, { RaceConfig } from '../components/sidebar/RaceSettings';
import { LaneBuffer, createLaneBuffer, pushChunk } from '../utils/raceBuffers';
import { getProviderColor } from '../utils/providerColors';
import { getProviderById, RACEABLE_PROVIDERS } from '../utils/providers';
import type { PaceLane } from '../components/main/LivePaceChart';
import FinishSummary from '../components/main/FinishSummary';
import PaceLegend from '../components/main/PaceLegend';
import ModelIdentifier from '../components/ModelIdentifier';
import RaceHistory from '../components/main/RaceHistory';
import RaceClock from '../components/main/RaceClock';
import { playRaceTone, primeRaceAudio } from '../utils/raceAudio';
import {
  clearRaceHistory,
  createRaceReceipt,
  deleteRaceReceipt,
  loadRaceHistory,
  saveRaceReceipt,
  type BrowserTiming,
  type RaceExperience,
  type RaceReceipt,
  type ReceiptLaneInput,
} from '../utils/raceReceipts';

// The lineup guide and lane cards are server-rendered (no `ssr: false`), so the first paint
// already has the page's shape. Only the canvas and rAF-driven views are client-only.
const ResultsDisplay = dynamic(() => import('../components/main/ResultsDisplay'));
const ComparisonCharts = dynamic(() => import('../components/ComparisonCharts'), { ssr: false });
const LivePaceChart = dynamic(() => import('../components/main/LivePaceChart'), { ssr: false });
const DragStrip = dynamic(() => import('../components/main/DragStrip'), { ssr: false });
const StandingsTicker = dynamic(() => import('../components/main/StandingsTicker'), { ssr: false });

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
  resultMode: RaceConfig['mode'];
}

type AppAction =
  | { type: 'SET_PROMPT'; payload: string }
  | { type: 'SET_API_KEY'; payload: { providerId: string; apiKey: string } }
  | { type: 'TOGGLE_MODEL_SELECTION'; payload: { providerId: string; modelId: string } }
  | { type: 'CLEAR_PROVIDER_SELECTIONS'; payload: { providerId: string } }
  | { type: 'START_COMPARISON'; payload: { providersToTest: { providerId: string; modelId: string }[]; mode?: RaceConfig['mode'] } }
  | { type: 'RECEIVE_CHUNK'; payload: { resultId: string; chunk: string } }
  | { type: 'COMMIT_TEXT'; payload: Record<string, string> }
  | { type: 'FINISH_STREAM'; payload: { resultId: string; metrics: CompletionMetrics; browserTiming: BrowserTiming } }
  | { type: 'SET_META'; payload: { resultId: string; edgeRegion: string | null } }
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
  resultMode: 'drag',
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
        resultMode: action.payload.mode ?? state.raceConfig.mode,
        results: action.payload.providersToTest.map(p => ({
          id: `${p.providerId}-${p.modelId}`,
          providerName: p.providerId,
          modelName: p.modelId,
          responseText: '',
          metrics: null,
          isLoading: true,
          error: null,
          browserTiming: null,
          edgeRegion: null,
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
            ? {
                ...r,
                isLoading: false,
                metrics: action.payload.metrics,
                browserTiming: action.payload.browserTiming,
              }
            : r
        ),
      };
    case 'SET_META':
      return {
        ...state,
        results: state.results.map(r => (
          r.id === action.payload.resultId ? { ...r, edgeRegion: action.payload.edgeRegion } : r
        )),
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
  "Model speed is really two things: how long you wait for the first token, and how fast the rest of the reply streams after that. Total length matters too. Some models start almost right away and then slow down, while others pause for a second and still finish first. Racing them side by side shows that difference way better than a single average ever could. ";
const DEMO_LONG = DEMO_SAMPLE.repeat(10);

// --- Main Component ---

export default function Home() {
  const router = useRouter();
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
  const [experience, setExperience] = useState<RaceExperience>('quick');
  const [history, setHistory] = useState<RaceReceipt[]>([]);
  // Remounts the strip so a new or reset race never inherits the last one's DOM state.
  const [raceEpoch, setRaceEpoch] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
  const [isDemoRace, setIsDemoRace] = useState(false);
  const receiptLanesRef = useRef<Record<string, ReceiptLaneInput>>({});
  const edgeRegionRef = useRef<string | null>(null);
  const suggestedModel = typeof router.query.model === 'string' ? router.query.model.trim() : '';
  const suggestedProvider = typeof router.query.provider === 'string' ? router.query.provider.trim() : '';

  useEffect(() => {
    setHistory(loadRaceHistory(window.localStorage));
    try {
      setSoundOn(window.localStorage.getItem('ai-drag-racing:sound') === 'on');
    } catch {}
  }, []);

  // Starting-tree tones. Off until the visitor turns sound on.
  const previousRaceState = useRef<AppState['raceState']>('idle');
  useEffect(() => {
    if (!soundOn) return;
    if (typeof state.countdownValue === 'number') playRaceTone('amber');
    else if (state.countdownValue === 'Go!') playRaceTone('green');
  }, [soundOn, state.countdownValue]);
  useEffect(() => {
    const previous = previousRaceState.current;
    previousRaceState.current = state.raceState;
    if (!soundOn) return;
    // With reduced motion there is no countdown, so the green tone marks the launch.
    if (state.raceState === 'racing' && previous !== 'countingDown') playRaceTone('green');
    if (state.raceState === 'finished' && previous === 'racing') playRaceTone('finish');
  }, [soundOn, state.raceState]);

  const toggleSound = useCallback(() => {
    setSoundOn((on) => {
      const next = !on;
      try {
        window.localStorage.setItem('ai-drag-racing:sound', next ? 'on' : 'off');
      } catch {}
      if (next) {
        primeRaceAudio();
        playRaceTone('amber');
      }
      return next;
    });
  }, []);

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
    receiptLanesRef.current = {};
    edgeRegionRef.current = null;
    setAnnouncement('');
    setRaceEpoch((epoch) => epoch + 1);
    setIsDemoRace(false);
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
  // Before a race, the strip shows whoever is ready to run: selected models whose
  // provider is enabled and has a key in this tab.
  const stagedSig = state.selectedPairs
    .filter((p) => state.enabledProviders[p.providerId] !== false && !!state.apiKeys[p.providerId] && !!p.modelId)
    .map((p) => `${p.providerId}\u0000${p.modelId}`)
    .join('\u0001');
  const stagedLanes = useMemo<PaceLane[]>(
    () =>
      stagedSig
        ? stagedSig.split('\u0001').map((pair) => {
            const [providerId, modelId] = pair.split('\u0000');
            return {
              id: `${providerId}-${modelId}`,
              label: getProviderById(providerId)?.displayName || providerId,
              sublabel: modelId,
              color: getProviderColor(providerId).solid,
            };
          })
        : [],
    [stagedSig]
  );
  const hasRace = state.results.length > 0;
  const stripLanes = hasRace ? paceLanes : stagedLanes;
  const showStage = hasRace && (state.raceState === 'racing' || state.raceState === 'finished');
  const raceBusy = state.raceState === 'countingDown' || state.raceState === 'racing';
  // A race can start once at least one lane is staged and none is already running.
  const startDisabled = stagedLanes.length === 0 || raceBusy;

  const handleSetUpLiveRace = useCallback(() => {
    // Phones open the Racers drawer. On wider screens the rail is already there,
    // so move focus to the first provider's key control instead.
    window.dispatchEvent(new Event('ai-drag-racing:open-racers'));
    window.requestAnimationFrame(() => {
      const panel = document.querySelector<HTMLElement>('.provider-panel');
      const target = panel?.querySelector<HTMLElement>('.provider-key-button');
      if (!panel || !target) return;
      target.focus({ preventScroll: false });
      panel.dataset.nudge = 'true';
      window.setTimeout(() => {
        delete panel.dataset.nudge;
      }, 1400);
    });
  }, []);


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
    const raceController = new AbortController();
    abortRef.current = raceController;
    const signal = raceController.signal;
    const isCurrentRace = () => abortRef.current === raceController && !signal.aborted;
    // Reset the live race engine, then stage lanes before the countdown.
    const initialBuffers: Record<string, LaneBuffer> = {};
    for (const p of providersToTest) {
      const id = `${p.providerId}-${p.modelId}`;
      initialBuffers[id] = createLaneBuffer(id);
    }
    laneBuffersRef.current = initialBuffers;
    pendingTextRef.current = {};
    receiptLanesRef.current = {};
    edgeRegionRef.current = null;
    setRaceEpoch((epoch) => epoch + 1);
    setIsDemoRace(false);
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
    const delay = (ms: number) => waitForRaceDelay(ms, signal);
    if (reduceMotion) {
      // Skip countdown for accessibility
      dispatch({ type: 'SET_RACE_STATE', payload: 'racing' });
      dispatch({ type: 'SET_COUNTDOWN', payload: null });
    } else {
      dispatch({ type: 'SET_RACE_STATE', payload: 'countingDown' });
      for (const val of [3, 2, 1] as const) {
        dispatch({ type: 'SET_COUNTDOWN', payload: val });
        await delay(700);
        if (!isCurrentRace()) return;
      }
      dispatch({ type: 'SET_COUNTDOWN', payload: 'Go!' });
      await delay(300);
      if (!isCurrentRace()) return;
      dispatch({ type: 'SET_RACE_STATE', payload: 'racing' });
      dispatch({ type: 'SET_COUNTDOWN', payload: null });
    }
    if (!isCurrentRace()) return;
    // Get race config and prepare settings
    const { mode, tokenLimit, timeLimit, modelSettings } = state.raceConfig;
    const raceStartTime = Date.now();
    // Single shared "Go!" instant — the fair cross-model baseline for the pace chart.
    const goTime = performance.now();
    goTimeRef.current = goTime;
    const deadline = mode === 'time_limit' && timeLimit
      ? createRaceDeadline(goTime, timeLimit * 1000, signal)
      : null;
    const streamSignal = deadline?.signal ?? signal;
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
          setAnnouncement(`${getProviderById(p.providerId)?.displayName || p.providerId} failed: API key not set.`);
          return;
        }
        let sawMetrics = false;
        let tokenCount = 0;
        const finishLimitedLane = () => {
          // For limited races, synthesize metrics from what we collected — but use the
          // REAL client-observed first-token time instead of a hardcoded +100ms.
          const totalMs = Math.round(performance.now() - goTime);
          const finishTime = raceStartTime + totalMs;
          const buf = laneBuffersRef.current[resultId];
          if (buf) buf.done = true;
          flushLane(resultId);
          const metrics: CompletionMetrics = {
            startTime: raceStartTime,
            firstTokenTime:
              buf && buf.firstTokenT != null ? raceStartTime + Math.round(buf.firstTokenT) : undefined,
            finishTime,
            tokenCount,
            outputTokens: tokenCount,
            tokenCountSource: 'stream-events',
            timingSource: 'browser-synthetic',
          };
          const browserTiming = {
            ttftMs: buf?.firstTokenT != null ? Math.round(buf.firstTokenT) : null,
            totalMs,
          };
          receiptLanesRef.current[resultId] = {
            providerId: p.providerId,
            modelId: p.modelId,
            metrics,
            browser: browserTiming,
            error: null,
          };
          dispatch({
            type: 'FINISH_STREAM',
            payload: {
              resultId,
              metrics,
              browserTiming,
            },
          });
          setAnnouncement(`${getProviderById(p.providerId)?.displayName || p.providerId} finished.`);
        };
        try {
          // Clone settings and remove reasoningEffort if this model was excluded (toggled off)
          const effectiveSettings = { ...modelSettings };
          if (state.raceConfig.excludedReasoningModels?.includes(p.modelId)) {
            effectiveSettings.reasoningEffort = undefined;
          }

          const stream = streamCompletion(p.providerId, state.prompt, p.modelId, apiKey, effectiveSettings, streamSignal);

          for await (const result of stream) {
            if (!isCurrentRace()) return;
            // Enforce the logical cutoff even if the deadline callback is delayed.
            // Events observed exactly at the deadline are outside the trial.
            const observedAt = performance.now();
            if (deadline?.reached(observedAt)) break;
            if (result.type === 'chunk') {
              tokenCount++;
              const tNow = observedAt - goTime;
              const buf = laneBuffersRef.current[resultId];
              if (buf) pushChunk(buf, result.content, tNow);
              pendingTextRef.current[resultId] = (pendingTextRef.current[resultId] || '') + result.content;
              // Chunk Sprint retains its existing whole-event stopping rule.
              if (mode === 'token_limit' && tokenLimit && tokenCount >= tokenLimit) break;
            } else if (result.type === 'meta') {
              edgeRegionRef.current = result.data.edgeRegion;
              dispatch({ type: 'SET_META', payload: { resultId, edgeRegion: result.data.edgeRegion } });
            } else if (result.type === 'error') {
              throw new Error(result.message || 'Provider stream failed');
            } else if (result.type === 'metrics') {
              const buf = laneBuffersRef.current[resultId];
              if (buf) {
                buf.done = true;
                buf.finalOutputTokens =
                  typeof result.data.outputTokens === 'number' ? result.data.outputTokens : null;
              }
              const browserTiming = {
                ttftMs: buf?.firstTokenT != null ? Math.round(buf.firstTokenT) : null,
                totalMs: Math.round(observedAt - goTime),
              };
              receiptLanesRef.current[resultId] = {
                providerId: p.providerId,
                modelId: p.modelId,
                metrics: result.data,
                browser: browserTiming,
                error: null,
              };
              flushLane(resultId);
              dispatch({ type: 'FINISH_STREAM', payload: { resultId, metrics: result.data, browserTiming } });
              setAnnouncement(`${getProviderById(p.providerId)?.displayName || p.providerId} finished.`);
              sawMetrics = true;
            }
          }
          if (!isCurrentRace()) return;
          // If the stream closed without emitting metrics (e.g., due to limits), create synthetic metrics
          if (!sawMetrics) {
            if (mode === 'token_limit' || mode === 'time_limit') {
              finishLimitedLane();
            } else {
              const buf = laneBuffersRef.current[resultId];
              if (buf) { buf.errored = true; buf.done = true; }
              flushLane(resultId);
              dispatch({ type: 'SET_ERROR', payload: { resultId, error: 'Stream ended without metrics' } });
              setAnnouncement(`${getProviderById(p.providerId)?.displayName || p.providerId} failed: the stream ended without metrics.`);
            }
          }
        } catch (e: any) {
          if (!isCurrentRace()) return;
          if (deadline?.isLimitError(e)) {
            if (!sawMetrics) finishLimitedLane();
            return;
          }
          const buf = laneBuffersRef.current[resultId];
          if (buf) { buf.errored = true; buf.done = true; }
          flushLane(resultId);
          receiptLanesRef.current[resultId] = {
            providerId: p.providerId,
            modelId: p.modelId,
            metrics: null,
            browser: {
              ttftMs: buf?.firstTokenT != null ? Math.round(buf.firstTokenT) : null,
              totalMs: Math.round(performance.now() - goTime),
            },
            error: e instanceof Error ? e.message : 'Provider stream failed',
          };
          dispatch({ type: 'SET_ERROR', payload: { resultId, error: e.message } });
          setAnnouncement(`${getProviderById(p.providerId)?.displayName || p.providerId} failed: ${e.message}`);
        }
      })
    ).finally(() => deadline?.dispose());
    if (!isCurrentRace()) return;
    // Final flush + stop the throttled committer so the transcripts are complete.
    stopFlush();
    const remaining = pendingTextRef.current;
    if (Object.keys(remaining).length) {
      pendingTextRef.current = {};
      dispatch({ type: 'COMMIT_TEXT', payload: remaining });
    }
    setAnnouncement('Race finished. The timing receipt is ready below the track.');
    const receipt = await createRaceReceipt({
      experience,
      mode,
      prompt: state.prompt,
      edgeRegion: edgeRegionRef.current,
      userAgentFamily: navigator.userAgent.includes('Firefox')
        ? 'Firefox'
        : navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')
          ? 'Safari'
          : 'Chromium',
      settings: {
        temperature: modelSettings.temperature,
        maxTokens: modelSettings.maxTokens,
        topP: modelSettings.topP,
        repetitions: 1,
        concurrency: 1,
      },
      lanes: providersToTest.map((pair) => {
        const id = `${pair.providerId}-${pair.modelId}`;
        return {
          ...(receiptLanesRef.current[id] ?? {
            providerId: pair.providerId,
            modelId: pair.modelId,
            metrics: null,
            browser: { ttftMs: null, totalMs: null },
            error: 'No receipt data was produced',
          }),
          // Read accepted stream data, not the stale results captured at Start.
          outputCharacters: laneBuffersRef.current[id]?.chars,
        };
      }),
    });
    if (!isCurrentRace()) return;
    setHistory(saveRaceReceipt(window.localStorage, receipt));
    dispatch({ type: 'FINISH_COMPARISON' });
  }, [experience, state.prompt, state.apiKeys, state.selectedPairs, state.enabledProviders, state.raceConfig]);

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
    setRaceEpoch((epoch) => epoch + 1);
    setIsDemoRace(true);
    dispatch({ type: 'START_COMPARISON', payload: { providersToTest: pairs, mode: 'drag' } });

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
          const metrics: CompletionMetrics = {
            startTime: raceStartTime,
            firstTokenTime: raceStartTime + d.ttft,
            finishTime,
            tokenCount: Math.round(d.total / 4),
            outputTokens: Math.round(d.total / 4),
            tokenCountSource: 'estimated',
            timingSource: 'demo',
          };
          dispatch({
            type: 'FINISH_STREAM',
            payload: {
              resultId,
              metrics,
              browserTiming: {
                ttftMs: d.ttft,
                totalMs: Math.round(performance.now() - goTimeRef.current),
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
    setAnnouncement('Demo race finished. The timing receipt is ready below.');
    dispatch({ type: 'FINISH_COMPARISON' });
  }, [state.raceState]);

  return (
    <>
      <Head>
        <title>AI Drag Racing | Compare AI Speed From Your Browser</title>
        <meta name="description" content="Send the same prompt to AI models from your browser and compare real response times. Every run reflects your current route and moment rather than a global ranking." />

        {/* Canonical URL */}
        <link rel="canonical" href="https://ai-dragrace.jonathanrreed.com/" />

        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Jonathan R. Reed" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="AI Drag Racing | Compare AI Speed From Your Browser" />
        <meta property="og:description" content="Send the same prompt to AI models from your browser and compare real response times. Every run reflects your current route and moment rather than a global ranking." />
        <meta property="og:url" content="https://ai-dragrace.jonathanrreed.com/" />
        <meta property="og:image" content="https://ai-dragrace.jonathanrreed.com/social-card.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AI Drag Racing | Compare AI Speed From Your Browser" />
        <meta name="twitter:description" content="Send the same prompt to AI models from your browser and compare real response times. Every run reflects your current route and moment rather than a global ranking." />
        <meta name="twitter:image" content="https://ai-dragrace.jonathanrreed.com/social-card.png" />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": "https://ai-dragrace.jonathanrreed.com/#website",
                  "name": "AI Drag Racing",
                  "description": "Send the same prompt to AI models from your browser and compare real response times. Every run reflects your current route and moment rather than a global ranking.",
                  "url": "https://ai-dragrace.jonathanrreed.com/",
                  "inLanguage": "en-US",
                  "datePublished": "2026-04-21",
                  "dateModified": "2026-09-05",
                  "author": AUTHOR_REF,
                  "publisher": AUTHOR_REF
                },
                {
                  "@type": "WebApplication",
                  "@id": "https://ai-dragrace.jonathanrreed.com/#app",
                  "name": "AI Drag Racing",
                  "url": "https://ai-dragrace.jonathanrreed.com/",
                  "applicationCategory": "DeveloperApplication",
                  "operatingSystem": "Any",
                  "browserRequirements": "Requires JavaScript and your own provider API key, which stays in this browser tab.",
                  "isAccessibleForFree": true,
                  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
                  "featureList": [
                    "Time to first token, total time, and tokens per second for one live request per model",
                    "Browser clock and Cloudflare edge clock reported separately",
                    "Multiple models racing from one shared start",
                    "Sanitized local receipts kept in your browser for 30 days, exportable anytime",
                    "Methodology page explaining every clock and what is left out"
                  ],
                  "author": AUTHOR_REF,
                  "isPartOf": { "@id": "https://ai-dragrace.jonathanrreed.com/#website" }
                },
                AUTHOR_PERSON
              ]
            })
          }}
        />

        <link rel="icon" href="/Favicon/favicon.ico" sizes="any" />
      </Head>
      <MainLayout
        sidebar={
          <div className="rail">
            {/* Small prompt card above models */}
            <PromptInput
              prompt={state.prompt}
              onPromptChange={(p) => dispatch({ type: 'SET_PROMPT', payload: p })}
              onSubmit={handleRunComparison}
              isLoading={state.isLoading}
              isCountingDown={state.raceState === 'countingDown'}
              disabled={startDisabled}
            />
            <div className="experience-switch" role="group" aria-label="Race experience">
              <button
                type="button"
                className={experience === 'quick' ? 'is-active' : ''}
                aria-pressed={experience === 'quick'}
                onClick={() => setExperience('quick')}
              >
                <strong>Quick Race</strong>
                <span>One live comparison</span>
              </button>
              <button
                type="button"
                className={experience === 'lab' ? 'is-active' : ''}
                aria-pressed={experience === 'lab'}
                onClick={() => setExperience('lab')}
              >
                <strong>Experiment Lab</strong>
                <span>Controlled settings</span>
              </button>
            </div>
            {experience === 'lab' ? (
              <RaceSettings
                config={state.raceConfig}
                onChange={(config) => dispatch({ type: 'SET_RACE_CONFIG', payload: config })}
                selectedPairs={state.selectedPairs}
              />
            ) : (
              <div className="quick-race-note">
                Quick Race uses the same settings in every lane: temperature {state.raceConfig.modelSettings.temperature.toFixed(1)},
                {' '}max {state.raceConfig.modelSettings.maxTokens} tokens, top p {state.raceConfig.modelSettings.topP.toFixed(1)}.
              </div>
            )}
            {suggestedModel && (
              <div className="race-model-handoff" role="status">
                <span>From AI Stats</span>
                <strong><ModelIdentifier value={suggestedModel} /></strong>
                <p>
                  Add the key for this provider to test it. If the provider is known, the model search is already filled in.
                </p>
                <button
                  type="button"
                  onClick={() => void router.replace('/', undefined, { shallow: true })}
                >
                  Clear
                </button>
              </div>
            )}
            <div className="panel rail-racers">
              <ProviderList
                apiKeys={state.apiKeys}
                dispatch={dispatch}
                selectedPairs={state.selectedPairs}
                suggestedModel={suggestedModel}
                suggestedProvider={suggestedProvider}
              />
            </div>
          </div>
        }
      >
        <header className="race-hero">
          <div className="race-hero-copy">
            <h1 className="race-hero-title">See how fast a model responds from here.</h1>
            <p className="race-hero-lead">
              Send the same prompt to a few AI models and see how fast they respond from your own browser. Every run
              depends on your connection, your prompt, and how busy each provider is right now.
            </p>
          </div>
          <div className="race-hero-actions">
            <button
              type="button"
              className={stagedLanes.length > 0 ? 'race-hero-action-secondary' : 'race-hero-action-primary'}
              onClick={handleRunDemo}
              disabled={raceBusy}
            >
              Run a demo race
            </button>
            <button type="button" className="race-hero-action-secondary" onClick={handleSetUpLiveRace}>
              Set up a live race
            </button>
            <span>Demo timings are simulated and never saved.</span>
          </div>
        </header>

        {/* The strip: staged before a race, live during it, frozen after. */}
        <section className="stage" aria-label="Race track" data-race={state.raceState}>
          <div className="stage-bar">
            <div className="stage-bar-group">
              <div className="seg-toggle" role="group" aria-label="Race view">
                <button type="button" onClick={() => setRaceView('strip')} aria-pressed={raceView === 'strip'}>
                  Track
                </button>
                <button type="button" onClick={() => setRaceView('telemetry')} aria-pressed={raceView === 'telemetry'}>
                  Telemetry
                </button>
              </div>
              <span className="stage-status" data-state={state.raceState}>
                <i aria-hidden="true" />
                {state.raceState === 'racing'
                  ? 'Live'
                  : state.raceState === 'countingDown'
                    ? 'Staging'
                    : state.raceState === 'finished'
                      ? 'Finished'
                      : stagedLanes.length > 0
                        ? `${stagedLanes.length} staged`
                        : 'No racers staged'}
                {hasRace && isDemoRace ? ', simulated demo' : ''}
              </span>
            </div>
            <div className="stage-bar-group">
              <RaceClock
                goTimeRef={goTimeRef}
                buffersRef={laneBuffersRef}
                raceState={state.raceState}
                reducedMotion={reducedMotion}
              />
              <button
                type="button"
                className="stage-icon-button"
                onClick={toggleSound}
                aria-pressed={soundOn}
                aria-label="Starting tree sound"
                title={soundOn ? 'Sound on' : 'Sound off'}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 9v6h4l5 4V5L8 9H4Z" />
                  {soundOn ? <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /> : <path d="m17 9.5 5 5m0-5-5 5" />}
                </svg>
              </button>
              {hasRace && (
                <button
                  onClick={handleReset}
                  title={(state.isLoading || state.raceState === "countingDown") ? "Cannot reset while racing" : "Reset race"}
                  className="race-reset-button"
                  disabled={state.isLoading || state.raceState === 'countingDown'}
                >
                  Reset
                </button>
              )}
              {/* Primary control lives on the strip so it is reachable when the rail is closed on mobile */}
              <button
                onClick={handleRunComparison}
                title={(!state.prompt) ? "Enter a prompt to start" : startDisabled ? "No racers selected" : state.raceState === "racing" ? "Race in progress" : "Start Race"}
                className="race-start-button"
                disabled={startDisabled || !state.prompt}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M5 3l14 9-14 9V3z" />
                </svg>
                Start race
              </button>
            </div>
          </div>

          {raceView === 'telemetry' && stripLanes.length > 0 && (
            <div className="stage-subbar">
              <span>X: seconds since Go. Y: characters streamed.</span>
              <button
                type="button"
                onClick={() => setNormalize((v) => !v)}
                aria-pressed={normalize}
                className="btn-ghost"
                title="Toggle the Y scale between absolute characters and percent of the most output so far"
              >
                {normalize ? 'Scale: % of most output' : 'Scale: absolute'}
              </button>
            </div>
          )}

          <div className={hasRace ? 'stage-body has-standings' : 'stage-body'}>
            <div className="stage-view">
              {stripLanes.length === 0 ? (
                <div className="strip strip-empty">
                  {[1, 2].map((n) => (
                    <div key={n} className="strip-lane" data-state="stage">
                      <div className="strip-head">
                        <span className="strip-plate" aria-hidden="true">{n}</span>
                        <span className="strip-who">
                          <span className="strip-name">Open lane</span>
                          <span className="strip-model">No model yet</span>
                        </span>
                      </div>
                      <div className="strip-track">
                        <span className="strip-groove" aria-hidden="true" />
                        <span className="strip-number" aria-hidden="true">{n}</span>
                        <span className="strip-startline" aria-hidden="true" />
                        <span className="strip-finish" aria-hidden="true" />
                      </div>
                      <div className="strip-board">
                        <span className="strip-winlight" aria-hidden="true" />
                        <span className="strip-digits" data-ghost="8.88">
                          <span className="strip-digits-lit" aria-hidden="true">-.--</span>
                        </span>
                        <span className="strip-sub">Empty</span>
                      </div>
                    </div>
                  ))}
                  <p className="strip-empty-note">
                    <strong>No models picked yet.</strong> Add a provider key and pick a few models in Racers to put
                    them on the track, or run the demo to try it with four simulated lanes.
                  </p>
                </div>
              ) : raceView === 'strip' ? (
                <DragStrip
                  key={raceEpoch}
                  lanes={stripLanes}
                  buffersRef={laneBuffersRef}
                  goTimeRef={goTimeRef}
                  running={state.raceState === 'racing'}
                  reducedMotion={reducedMotion}
                  mode={state.resultMode}
                />
              ) : (
                <>
                  <LivePaceChart
                    key={raceEpoch}
                    lanes={stripLanes}
                    buffersRef={laneBuffersRef}
                    goTimeRef={goTimeRef}
                    running={state.raceState === 'racing'}
                    reducedMotion={reducedMotion}
                    normalize={normalize}
                  />
                  <PaceLegend lanes={stripLanes} />
                </>
              )}
            </div>
            {hasRace && (
              <aside className="stage-standings" aria-labelledby="standings-heading">
                <h2 id="standings-heading">Standings</h2>
                <StandingsTicker
                  lanes={paceLanes}
                  buffersRef={laneBuffersRef}
                  running={state.raceState === 'racing'}
                  mode={state.resultMode}
                  reducedMotion={reducedMotion}
                />
              </aside>
            )}
          </div>
        </section>

        {/* Live race announcements for assistive technology */}
        <div className="sr-only" role="status" aria-live="polite">{announcement}</div>

        {state.raceState === 'finished' && (
          // The slip's torn edge is a mask, which would clip its own shadow, so the wrapper casts it.
          <div className="slip">
            <FinishSummary results={state.results} mode={state.resultMode} />
          </div>
        )}

        <div className="race-output">
          <div className="race-toolbar">
            <div className="race-tabs" role="tablist" aria-label="Race output">
              <button
                type="button"
                role="tab"
                id="race-tab-results"
                aria-selected={activeTab === 'results'}
                aria-controls="race-panel-results"
                onClick={() => setActiveTab('results')}
                className={`race-tab ${activeTab === 'results' ? 'is-active' : ''}`}
              >
                Responses
              </button>
              <button
                type="button"
                role="tab"
                id="race-tab-charts"
                aria-selected={activeTab === 'charts'}
                aria-controls="race-panel-charts"
                onClick={() => setActiveTab('charts')}
                className={`race-tab ${activeTab === 'charts' ? 'is-active' : ''}`}
                disabled={!hasRace}
                aria-label={!hasRace ? 'Charts, available after a race' : undefined}
                title={!hasRace ? 'Charts become available after a race' : undefined}
              >
                Charts
              </button>
            </div>
            {hasRace && (
              <div className="race-actions">
                <button
                  onClick={() => setHideFailed((v) => !v)}
                  className="race-tool-button"
                  disabled={activeTab !== 'results'}
                >
                  {hideFailed ? 'Show failed' : 'Hide failed'}
                </button>
                <button
                  onClick={() => setForce((f) => ({ version: f.version + 1, collapsed: true }))}
                  className="race-tool-button"
                  disabled={activeTab !== 'results'}
                >
                  Collapse all
                </button>
                <button
                  onClick={() => setForce((f) => ({ version: f.version + 1, collapsed: false }))}
                  className="race-tool-button"
                  disabled={activeTab !== 'results'}
                >
                  Expand all
                </button>
              </div>
            )}
          </div>

          {activeTab === 'results' && (
            <div id="race-panel-results" role="tabpanel" aria-labelledby="race-tab-results" className="race-panel">
              <ResultsDisplay results={state.results} hideFailed={hideFailed} force={force} compact={showStage} stagedCount={stagedLanes.length} />
              <RaceHistory
                receipts={history}
                onDelete={(id) => setHistory(deleteRaceReceipt(window.localStorage, id))}
                onClear={() => {
                  clearRaceHistory(window.localStorage);
                  setHistory([]);
                }}
              />
            </div>
          )}
          {activeTab === 'charts' && hasRace && (
            <div id="race-panel-charts" role="tabpanel" aria-labelledby="race-tab-charts" className="race-panel">
              <ComparisonCharts results={state.results} />
            </div>
          )}
        </div>

        <section className="race-notes" aria-labelledby="race-notes-heading">
          <h2 id="race-notes-heading">What a race measures</h2>
          <dl className="race-hero-facts">
            <div>
              <dt>Private by default</dt>
              <dd>Keys last only for this tab</dd>
            </div>
            <div>
              <dt>Two clocks</dt>
              <dd>Browser to result, plus Cloudflare edge to provider</dd>
            </div>
            <div>
              <dt>30-day local history</dt>
              <dd>Delete or export anytime</dd>
            </div>
            <div>
              <dt>Providers</dt>
              <dd>
                {RACEABLE_PROVIDERS.length} race-ready providers
              </dd>
            </div>
            <div>
              <dt>Timed per lane</dt>
              <dd>Time to first token, total response time, tokens per second</dd>
            </div>
            <div>
              <dt>What a run means</dt>
              <dd>One live run from your browser, never a global ranking</dd>
            </div>
            <div>
              <dt>Sample size</dt>
              <dd>One run per model, so run it a few times before trusting the order</dd>
            </div>
            <div>
              <dt>Defaults</dt>
              <dd>
                temperature {initialState.raceConfig.modelSettings.temperature}, max tokens{' '}
                {initialState.raceConfig.modelSettings.maxTokens}, top p{' '}
                {initialState.raceConfig.modelSettings.topP.toFixed(1)}
              </dd>
            </div>
          </dl>
          <details className="race-details">
            <summary className="race-details-summary">
              How to read an AI model race
            </summary>
            <div className="race-details-copy">
              <p>
                Every model in a race gets the same prompt and settings from your browser session. Time to first token
                tells you how long you wait before anything shows up on screen, and total response time tells you how
                long the full answer took. Tokens per second matters more on longer replies, because a model can answer
                quickly at first and still stream slowly after that. The live pace chart tracks characters received
                against one shared browser clock, so it shows what your browser actually saw as text came in.
              </p>
              <p>
                A single race only shows what happened right then. Your network path, provider load, region, prompt
                length, reasoning settings, and how much the model decides to write all affect the numbers. One run can
                easily hit a random spike, so running the same prompt a few times gives you a much better feel for
                what&apos;s actually slow. Always look at the response next to the clock too, because a model often
                looks faster just because it wrote half as much.
              </p>
            </div>
          </details>
        </section>
      </MainLayout>
      {/* Countdown overlay */}
      <CountdownOverlay visible={state.raceState === 'countingDown'} value={state.countdownValue ?? 3} />
    </>
  );
}
