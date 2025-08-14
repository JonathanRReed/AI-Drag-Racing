import React, { useReducer, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '../components/layout/MainLayout';
import ProviderList from '../components/sidebar/ProviderList';
import PromptInput from '../components/main/PromptInput';
import ResultsDisplay, { ResultState } from '../components/main/ResultsDisplay';
import ComparisonCharts from '../components/ComparisonCharts';
import { streamCompletion } from '../utils/apiClient';
import { CompletionMetrics } from '../utils/providerService';
import GlassCard from '../components/layout/GlassCard'; // Correct import location

// --- State Management using useReducer ---

interface AppState {
  prompt: string;
  isLoading: boolean;
  apiKeys: Record<string, string>;
  selectedModels: Record<string, { providerId: string; modelId: string }>;
  results: ResultState[];
}

type AppAction =
  | { type: 'SET_PROMPT'; payload: string }
  | { type: 'SET_API_KEY'; payload: { providerId: string; apiKey: string } }
  | { type: 'TOGGLE_MODEL_SELECTION'; payload: { providerId: string; modelId: string } }
  | { type: 'START_COMPARISON'; payload: { providersToTest: { providerId: string; modelId: string }[] } }
  | { type: 'RECEIVE_CHUNK'; payload: { resultId: string; chunk: string } }
  | { type: 'FINISH_STREAM'; payload: { resultId: string; metrics: CompletionMetrics } }
  | { type: 'SET_ERROR'; payload: { resultId: string; error: string } }
  | { type: 'FINISH_COMPARISON' };

const initialState: AppState = {
  prompt: 'Write a short story about a robot who discovers music.',
  isLoading: false,
  apiKeys: {},
  selectedModels: {},
  results: [],
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_PROMPT':
      return { ...state, prompt: action.payload };
    case 'SET_API_KEY':
      return { ...state, apiKeys: { ...state.apiKeys, [action.payload.providerId]: action.payload.apiKey } };
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
      return { ...state, isLoading: false };
    default:
      return state;
  }
}

// --- Main Component ---

export default function Home() {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const handleRunComparison = useCallback(async () => {
    const providersToTest = [
      { providerId: 'openai', modelId: 'gpt-3.5-turbo' },
      { providerId: 'groq', modelId: 'llama3-8b-8192' },
    ];
    dispatch({ type: 'START_COMPARISON', payload: { providersToTest } });
    await Promise.all(
      providersToTest.map(async (p) => {
        const resultId = `${p.providerId}-${p.modelId}`;
        const apiKey = state.apiKeys[p.providerId];
        if (!apiKey) {
          dispatch({ type: 'SET_ERROR', payload: { resultId, error: 'API Key not set' } });
          return;
        }
        try {
          const stream = streamCompletion(p.providerId, state.prompt, p.modelId, apiKey);
          for await (const result of stream) {
            if (result.type === 'chunk') {
              dispatch({ type: 'RECEIVE_CHUNK', payload: { resultId, chunk: result.content } });
            } else if (result.type === 'metrics') {
              dispatch({ type: 'FINISH_STREAM', payload: { resultId, metrics: result.data } });
            }
          }
        } catch (e: any) {
          dispatch({ type: 'SET_ERROR', payload: { resultId, error: e.message } });
        }
      })
    );
    dispatch({ type: 'FINISH_COMPARISON' });
  }, [state.prompt, state.apiKeys]);

  return (
    <>
      <Head>
        <title>AI Latency & Perf Comparator</title>
        <link rel="icon" type="image/svg+xml" href="/logo.svg" />
      </Head>
      <MainLayout
        sidebar={
          <GlassCard className="p-4 h-full">
            <ProviderList
              apiKeys={state.apiKeys}
              dispatch={dispatch}
            />
          </GlassCard>
        }
      >
        <div className="space-y-4">
          <PromptInput
            prompt={state.prompt}
            onPromptChange={(p) => dispatch({ type: 'SET_PROMPT', payload: p })}
            onSubmit={handleRunComparison}
            isLoading={state.isLoading}
          />
          {state.results.length > 0 && <ComparisonCharts results={state.results} />}
          <ResultsDisplay results={state.results} />
        </div>
      </MainLayout>
    </>
  );
}
