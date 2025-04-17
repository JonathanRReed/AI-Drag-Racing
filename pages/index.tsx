import React, { useState } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import ProviderConfig, { ProviderBlock } from '../components/ProviderConfig';
import PromptInput from '../components/PromptInput';
import { callModelApi, ModelApiResult } from '../utils/modelApi';
import Footer from '../components/Footer';
import { PROVIDERS } from '../utils/providers';

// Use the new provider config for initial provider and models
const DEFAULT_PROVIDER = PROVIDERS[0];

interface ResponseState extends ModelApiResult {
  id: number;
  provider: string;
  model: string;
  isLoading: boolean;
}

// Dynamically import ComparisonCharts to reduce initial bundle size
const DynamicComparisonCharts = dynamic(() => import('../components/ComparisonCharts'), { ssr: false });

export default function Home() {
  const [providerBlocks, setProviderBlocks] = useState<ProviderBlock[]>([{
    id: 1,
    provider: DEFAULT_PROVIDER.id,
    apiKey: '',
    model: '',
    endpoint: ''
  }]);
  const [nextId, setNextId] = useState(2);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [responses, setResponses] = useState<ResponseState[]>([]);
  const [retryId, setRetryId] = useState<number|null>(null);

  const handleAddBlock = () => {
    setProviderBlocks(blocks => [
      ...blocks,
      {
        id: nextId,
        provider: DEFAULT_PROVIDER.id,
        apiKey: '',
        model: '',
        endpoint: ''
      }
    ]);
    setNextId(id => id + 1);
  };

  const handleUpdateBlock = (id: number, field: keyof ProviderBlock, value: string) => {
    setProviderBlocks(blocks => blocks.map(b => {
      if (b.id !== id) return b;
      if (field === 'provider') {
        return {
          ...b,
          provider: value,
          model: ''
        };
      }
      return { ...b, [field]: value };
    }));
  };

  const handleRemoveBlock = (id: number) => {
    setProviderBlocks(blocks => blocks.filter(b => b.id !== id));
    setResponses(rs => rs.filter(r => r.id !== id));
  };

  const handlePromptChange = (val: string) => setPrompt(val);

  const handlePromptSubmit = async () => {
    setIsLoading(true);
    setResponses(providerBlocks.map(b => ({
      id: b.id,
      provider: b.provider,
      model: b.model,
      isLoading: true,
      output: null,
      latency: null,
      error: undefined
    })));
    await Promise.all(providerBlocks.map(async (b) => {
      if (!b.apiKey && PROVIDERS.find(p => p.id === b.provider)?.requiresApiKey) {
        setResponses(rs => rs.map(r => r.id === b.id ? {
          ...r,
          isLoading: false,
          error: 'No API key provided.'
        } : r));
        return;
      }
      setResponses(rs => rs.map(r => r.id === b.id ? { ...r, isLoading: true, error: undefined } : r));
      debugAzurePayload(b);
      const result = await callModelApi({
        provider: b.provider,
        apiKey: b.apiKey,
        model: b.provider === 'azure' ? b.model : b.model,
        prompt,
        endpoint: b.endpoint
      });
      setResponses(rs => rs.map(r => r.id === b.id ? {
        ...r,
        ...result,
        isLoading: false
      } : r));
    }));
    setIsLoading(false);
  };

  const handleRetry = async (id: number) => {
    setRetryId(id);
    const b = providerBlocks.find(b => b.id === id);
    if (!b) return;
    setResponses(rs => rs.map(r => r.id === id ? { ...r, isLoading: true, error: undefined } : r));
    debugAzurePayload(b);
    const result = await callModelApi({
      provider: b.provider,
      apiKey: b.apiKey,
      model: b.provider === 'azure' ? b.model : b.model,
      prompt,
      endpoint: b.endpoint
    });
    setResponses(rs => rs.map(r => r.id === id ? {
      ...r,
      ...result,
      isLoading: false
    } : r));
    setRetryId(null);
  };

  const debugAzurePayload = (b: ProviderBlock) => {
    if (b.provider === 'azure') {
      console.log('Azure API call payload:', {
        provider: b.provider,
        apiKey: !!b.apiKey,
        model: b.model,
        endpoint: b.endpoint,
        prompt
      });
    }
  };

  return (
    <>
      <Head>
        <link rel="icon" type="image/png" href="/logo.png" />
      </Head>
      <div className="min-h-screen w-full bg-transparent relative z-10 px-2 sm:px-4 md:px-8">
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-8 py-10">
          <div className="main-glass-panel">
            <h1 className="text-3xl font-bold mb-2 text-magenta drop-shadow-[0_0_10px_#ff00e6] text-center">API latency test</h1>
          </div>
          <div className="main-glass-panel">
            <h2 className="text-xl font-semibold mb-2 text-cyan-400 drop-shadow-[0_0_6px_#00fff7]">Providers & Models</h2>
            <ProviderConfig
              blocks={providerBlocks}
              onAdd={handleAddBlock}
              onRemove={handleRemoveBlock}
              onUpdate={handleUpdateBlock}
            />
          </div>
          <div className="main-glass-panel">
            <h2 className="text-xl font-semibold mb-2 text-cyan-400 drop-shadow-[0_0_6px_#00fff7]">Prompt Input</h2>
            <PromptInput
              prompt={prompt}
              onPromptChange={handlePromptChange}
              onSubmit={handlePromptSubmit}
              isLoading={isLoading}
            />
          </div>
          <div className="main-glass-panel">
            <h2 className="text-xl font-semibold mb-2 text-cyan-400 drop-shadow-[0_0_6px_#00fff7]">Responses</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {responses.map(r => (
                <div
                  key={r.id}
                  className={`main-glass-panel-inner ${r.isLoading ? 'opacity-70' : 'opacity-100'}`}
                  tabIndex={0}
                  aria-live="polite"
                >
                  <div className="font-bold text-cyan mb-1 drop-shadow-[0_0_6px_#00fff7]">{r.provider} <span className="font-normal text-yellow">({r.model})</span></div>
                  {r.isLoading ? (
                    <div className="flex items-center gap-2 text-text/50 italic"><Spinner /> Loading...</div>
                  ) : r.error ? (
                    <div className="flex flex-col gap-2">
                      <div className="text-red-400">Error: {r.error}</div>
                      <button
                        className="bg-magenta text-oled px-3 py-1 rounded hover:bg-cyan transition w-max text-xs border border-cyan-400/70 shadow-[0_0_8px_2px_#ff00e6] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2"
                        onClick={() => handleRetry(r.id)}
                        disabled={retryId === r.id}
                        aria-label="Retry API call"
                      >
                        {retryId === r.id ? <Spinner /> : 'Retry'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <pre className="whitespace-pre-wrap text-sm text-text/90 animate-fade-in">{r.output}</pre>
                      <div className="text-xs text-cyan mt-2">Latency: {r.latency} ms</div>
                    </>
                  )}
                </div>
              ))}
              {responses.length === 0 && (
                <div className="text-text/50 italic">No responses yet. Run a comparison to see results.</div>
              )}
            </div>
            {/* Chart/Leaderboard Section */}
            {responses.length > 0 && (
              <section className="mt-8">
                <DynamicComparisonCharts
                  responses={responses.map(r => ({
                    provider: r.provider,
                    model: r.model,
                    latency: typeof r.latency === 'number' ? r.latency : null,
                  }))}
                />
              </section>
            )}
          </div>
          <Footer />
        </div>
        <style jsx global>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: none; }
          }
          .animate-fade-in {
            animation: fade-in 0.5s cubic-bezier(.4,0,.2,1);
          }
        `}</style>
      </div>
    </>
  );
}

function Spinner() {
  return (
    <span className="inline-block align-middle" aria-label="Loading">
      <svg className="animate-spin h-5 w-5 text-cyan" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    </span>
  );
}
