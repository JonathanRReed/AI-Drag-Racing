// components/sidebar/ProviderList.tsx
import React, { useState, useMemo } from 'react';
import { PROVIDERS, ProviderConfig } from '../../utils/providers';
import { fetchModels } from '../../utils/fetchModels';
import ApiKeyModal from './ApiKeyModal';

// Icons
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;


interface ProviderListItemProps {
  provider: ProviderConfig;
  hasApiKey: boolean;
  onAddKey: () => void;
  onClearKey?: () => void;
}

// Build CDN URLs (monochrome only)
const ICON_PNG_LIGHT = (slug: string) => `https://unpkg.com/@lobehub/icons-static-png@latest/light/${slug}.png`;
const ICON_PNG_DARK = (slug: string) => `https://unpkg.com/@lobehub/icons-static-png@latest/dark/${slug}.png`;

// Slug fallbacks for certain providers with multiple variants in Lobe Icons
function providerSlugs(providerId: string): string[] {
  switch (providerId) {
    case 'google':
      // Simple Icons uses 'googlegemini' for Gemini
      return ['googlegemini', 'gemini', 'google'];
    case 'azure':
      // Try common Azure variants, prioritize openai-specific if present
      return ['azure-openai', 'azure', 'azure-ai', 'azureai', 'microsoftazure'];
    case 'together':
      return ['togetherai', 'together', 'together-ai'];
    case 'fireworks':
      return ['fireworksai', 'fireworks'];
    case 'openrouter':
      return ['openrouter'];
    case 'ai21':
      return ['ai21'];
    case 'deepseek':
      return ['deepseek'];
    case 'cohere':
      return ['cohere'];
    case 'mistral':
      return ['mistral'];
    case 'bedrock':
      // Map to AWS brand for color
      return ['amazonaws', 'aws', 'bedrock'];
    case 'xai':
      // xAI doesn't exist — fallback to 'x' brand
      return ['x', 'xai'];
    case 'cerebras':
      return ['cerebras'];
    default:
      return [providerId];
  }
}

// Generic icon component that attempts multiple sources in order
const IconImg: React.FC<{
  slugs: string[];
  className?: string;
  alt?: string;
  title?: string;
  fallback?: React.ReactNode;
}> = ({ slugs, className, alt = 'icon', title, fallback }) => {
  const [index, setIndex] = useState(0);
  // Monochrome only: prefer light → dark
  const sources = useMemo(() => {
    const lights = slugs.map(ICON_PNG_LIGHT);
    const darks = slugs.map(ICON_PNG_DARK);
    return [...lights, ...darks];
  }, [slugs]);
  const src = sources[index];
  if (!src) return <>{fallback}</>;
  return (
    <img
      src={src}
      alt={alt}
      title={title}
      className={className}
      loading="lazy"
      onError={() => setIndex((i) => i + 1)}
    />
  );
};

const ProviderListItem: React.FC<ProviderListItemProps> = ({ provider, hasApiKey, onAddKey, onClearKey }) => {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors duration-200">
      <div className="flex items-center gap-2 min-w-0">
        <IconImg
          slugs={providerSlugs(provider.id)}
          alt={`${provider.displayName} logo`}
          title={provider.displayName}
          className="w-5 h-5 rounded-sm shrink-0"
          fallback={
            <span className="w-5 h-5 inline-flex items-center justify-center rounded-sm text-[10px] font-bold text-gray-200 bg-white/10 border border-white/10 shrink-0">
              {provider.displayName.slice(0,1).toUpperCase()}
            </span>
          }
        />
        <span className="font-medium text-gray-200 truncate">{provider.displayName}</span>
        {hasApiKey && <CheckIcon />}
      </div>
      <div className="flex items-center gap-2">
        {hasApiKey && (
          <button
            onClick={onClearKey}
            className="px-2 py-0.5 text-xs rounded-md bg-zinc-800 text-gray-300 border border-white/10 hover:border-white/20"
          >
            Clear Key
          </button>
        )}
        <button
          onClick={onAddKey}
          className="p-1 rounded-md text-gray-400 hover:bg-white/20 hover:text-white transition-colors"
          aria-label={`${hasApiKey ? 'Edit' : 'Add'} API key for ${provider.displayName}`}
        >
          <PlusIcon />
        </button>
      </div>
    </div>
  );
};

interface ProviderListProps {
  apiKeys: Record<string, string>;
  dispatch: React.Dispatch<any>; // Using 'any' for simplicity, could be typed with AppAction
  // Selected provider-model pairs from parent for controlled multi-select UI
  selectedPairs: { providerId: string; modelId: string }[];
}

const ICON = (slug: string) => `https://unpkg.com/@lobehub/icons-static-svg@latest/icons/${slug}.svg`;

// Map model IDs to brand icon slug candidates (best-effort)
function brandSlugsForModel(providerId: string, modelId: string): string[] | undefined {
  const id = modelId.toLowerCase();
  // OpenRouter vendor prefix: vendor/model
  if (providerId === 'openrouter') {
    const vendor = id.split('/')[0] || '';
    if (vendor.includes('openai')) return ['openai'];
    if (vendor.includes('anthropic')) return ['anthropic'];
    if (vendor.includes('google')) return ['googlegemini', 'gemini', 'google'];
    if (vendor.includes('mistral') || vendor.includes('mistralai')) return ['mistral'];
    if (vendor.includes('meta') || vendor.includes('llama')) return ['meta', 'facebook'];
    if (vendor.includes('xai')) return ['x', 'xai'];
    if (vendor.includes('deepseek')) return ['deepseek', 'deepseek-ai', 'deepseekai'];
    if (vendor.includes('cohere')) return ['cohere'];
    if (vendor.includes('ai21')) return ['ai21'];
    if (vendor.includes('perplexity')) return ['perplexity'];
    if (vendor.includes('groq')) return ['groq'];
    if (vendor.includes('firework')) return ['fireworks', 'fireworksai'];
    return undefined;
  }
  // Provider-specific heuristics
  if (providerId === 'google' || id.startsWith('gemini')) return ['googlegemini', 'gemini', 'google'];
  if (providerId === 'anthropic' || id.startsWith('claude')) return ['anthropic'];
  if (providerId === 'openai' || id.startsWith('gpt') || id.includes('o1') || id.includes('4o')) return ['openai'];
  if (providerId === 'mistral' || id.includes('mistral') || id.includes('mixtral')) return ['mistral'];
  if (providerId === 'cohere' || id.includes('command')) return ['cohere'];
  if (providerId === 'groq') return ['groq'];
  if (providerId === 'ai21' || id.includes('jamba') || id.includes('ai21')) return ['ai21'];
  if (providerId === 'xai' || id.includes('grok')) return ['x', 'xai'];
  if (providerId === 'deepseek' || id.includes('deepseek')) return ['deepseek', 'deepseek-ai', 'deepseekai'];
  if (providerId === 'bedrock') return ['amazonaws', 'aws', 'bedrock'];
  if (providerId === 'together') return ['togetherai', 'together', 'together-ai'];
  if (providerId === 'fireworks') return ['fireworks', 'fireworksai'];
  return undefined;
}

const ProviderList: React.FC<ProviderListProps> = ({ apiKeys, dispatch, selectedPairs }) => {
  // Show both the beginning and end of long model IDs to avoid hiding key differences
  const formatModelLabel = React.useCallback((id: string, head = 18, tail = 14) => {
    if (!id) return id;
    if (id.length <= head + tail + 3) return id;
    return `${id.slice(0, head)}…${id.slice(-tail)}`;
  }, []);

  const [modalOpenFor, setModalOpenFor] = useState<ProviderConfig | null>(null);
  const [modelsByProvider, setModelsByProvider] = useState<Record<string, string[]>>({});
  const [savedFlash, setSavedFlash] = useState<Record<string, boolean>>({});
  const [enabledByProvider, setEnabledByProvider] = useState<Record<string, boolean>>({});
  const [modelQuery, setModelQuery] = useState<Record<string, string>>({});

  // Providers that are wired up server-side for streaming right now
  const SUPPORTED_FOR_STREAM = useMemo(() => new Set([
    'openai', 'groq', 'anthropic', 'google', 'cohere', 'mistral',
    'together', 'fireworks', 'openrouter'
  ]), []);

  const handleSaveApiKey = (apiKey: string) => {
    if (modalOpenFor) {
      dispatch({
        type: 'SET_API_KEY',
        payload: { providerId: modalOpenFor.id, apiKey }
      });
      // Also save to localStorage for persistence
      localStorage.setItem(`${modalOpenFor.id}_api_key`, apiKey);
      // Fetch models after saving key
      void loadModelsForProvider(modalOpenFor.id, apiKey);
      // Flash Saved ✓
      setSavedFlash(prev => ({ ...prev, [modalOpenFor.id]: true }));
      setTimeout(() => setSavedFlash(prev => ({ ...prev, [modalOpenFor!.id]: false })), 1800);
    }
  };

  const handleClearKey = (providerId: string) => {
    // Clear persisted values
    localStorage.removeItem(`${providerId}_api_key`);
    localStorage.removeItem(`${providerId}_models`);
    localStorage.removeItem(`${providerId}_selected_models`);
    localStorage.removeItem(`${providerId}_model`); // backward-compat
    // Update app state
    dispatch({ type: 'SET_API_KEY', payload: { providerId, apiKey: '' } });
    dispatch({ type: 'CLEAR_PROVIDER_SELECTIONS', payload: { providerId } });
    setModelsByProvider(prev => ({ ...prev, [providerId]: [] }));
    setEnabledByProvider(prev => ({ ...prev, [providerId]: false }));
    localStorage.setItem(`${providerId}_enabled`, 'false');
  };

  // On component mount, load keys from localStorage
  React.useEffect(() => {
    PROVIDERS.forEach(p => {
      const savedKey = localStorage.getItem(`${p.id}_api_key`);
      if (savedKey) {
        dispatch({ type: 'SET_API_KEY', payload: { providerId: p.id, apiKey: savedKey } });
      }
      // Enabled toggle
      const enabledStr = localStorage.getItem(`${p.id}_enabled`);
      const enabled = enabledStr === null ? true : enabledStr === 'true';
      setEnabledByProvider(prev => ({ ...prev, [p.id]: enabled }));
      dispatch({ type: 'SET_PROVIDER_ENABLED', payload: { providerId: p.id, enabled } });
      // Load cached models if present
      const cachedModels = localStorage.getItem(`${p.id}_models`);
      if (cachedModels) {
        try {
          const arr = JSON.parse(cachedModels);
          if (Array.isArray(arr)) {
            setModelsByProvider(prev => ({ ...prev, [p.id]: arr }));
          }
        } catch {}
      }
      // Load cached selected models (multi-select). Backward compat: also read old single-model key
      const savedMulti = localStorage.getItem(`${p.id}_selected_models`);
      const savedSingle = localStorage.getItem(`${p.id}_model`);
      let modelsToSelect: string[] = [];
      try {
        if (savedMulti) {
          const arr = JSON.parse(savedMulti);
          if (Array.isArray(arr)) modelsToSelect = arr.filter(Boolean);
        }
      } catch {}
      if (!modelsToSelect.length && savedSingle) modelsToSelect = [savedSingle];
      for (const m of modelsToSelect) {
        dispatch({ type: 'TOGGLE_MODEL_SELECTION', payload: { providerId: p.id, modelId: m } });
      }
    });
  }, [dispatch]);

  // When api keys change, fetch models for providers with keys (if not already loaded)
  React.useEffect(() => {
    (async () => {
      for (const p of PROVIDERS) {
        const key = apiKeys[p.id];
        if (!key) continue;
        if (!SUPPORTED_FOR_STREAM.has(p.id)) continue; // only fetch for supported providers
        if (modelsByProvider[p.id]?.length) continue; // already have
        try {
          const list = await fetchModels(p.id, key);
          if (Array.isArray(list) && list.length) {
            setModelsByProvider(prev => ({ ...prev, [p.id]: list }));
            localStorage.setItem(`${p.id}_models`, JSON.stringify(list));
          }
        } catch (e) {
          // swallow; show no dropdown
          console.warn(`[models] Failed to fetch models for ${p.id}:`, e);
        }
      }
    })();
  }, [apiKeys, modelsByProvider, SUPPORTED_FOR_STREAM]);

  async function loadModelsForProvider(providerId: string, key: string) {
    if (!SUPPORTED_FOR_STREAM.has(providerId)) return;
    try {
      const list = await fetchModels(providerId, key);
      if (Array.isArray(list) && list.length) {
        setModelsByProvider(prev => ({ ...prev, [providerId]: list }));
        localStorage.setItem(`${providerId}_models`, JSON.stringify(list));
      }
    } catch (e) {
      console.warn(`[models] Failed to fetch models for ${providerId}:`, e);
    }
  }

  const handleToggleModel = (providerId: string, modelId: string, checked: boolean) => {
    // Compute next selection list for persistence
    const current = selectedPairs.filter(p => p.providerId === providerId).map(p => p.modelId);
    const next = checked ? Array.from(new Set([...current, modelId])) : current.filter(m => m !== modelId);
    localStorage.setItem(`${providerId}_selected_models`, JSON.stringify(next));
    dispatch({ type: 'TOGGLE_MODEL_SELECTION', payload: { providerId, modelId } });
  };

  const handleToggleEnabled = (providerId: string, enabled: boolean) => {
    setEnabledByProvider(prev => ({ ...prev, [providerId]: enabled }));
    localStorage.setItem(`${providerId}_enabled`, String(enabled));
    dispatch({ type: 'SET_PROVIDER_ENABLED', payload: { providerId, enabled } });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Racing-themed header */}
      <div className="flex items-center gap-2.5 mb-4 px-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 flex items-center justify-center ring-1 ring-cyan-500/20">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">Racers</h2>
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Select your lineup</p>
        </div>
      </div>
      <ul className="space-y-1 flex-1 min-h-0 overflow-auto pr-1">
        {PROVIDERS.map((provider) => (
          <li key={provider.id} className="space-y-1">
            <ProviderListItem
              provider={provider}
              hasApiKey={!!apiKeys[provider.id]}
              onAddKey={() => setModalOpenFor(provider)}
              onClearKey={() => handleClearKey(provider.id)}
            />
            {/* Model selector appears when key is present and provider is supported and models list available */}
            {apiKeys[provider.id] && SUPPORTED_FOR_STREAM.has(provider.id) && (modelsByProvider[provider.id]?.length ? (
              <div className="px-2">
                <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Models</label>
                <div className="mb-1">
                  <input
                    type="text"
                    value={modelQuery[provider.id] || ''}
                    onChange={(e) => setModelQuery(prev => ({ ...prev, [provider.id]: e.target.value }))}
                    placeholder="Search models"
                    aria-label={`Search models for ${provider.displayName}`}
                    className="w-full px-2 py-1 text-xs rounded-md bg-zinc-900/60 border border-white/10 focus:border-white/20 outline-none text-gray-200 placeholder:text-gray-500"
                  />
                </div>
                <div className="max-h-60 overflow-auto rounded-md border border-white/10 divide-y divide-white/5 bg-zinc-900/40">
                  {(() => {
                    const list = modelsByProvider[provider.id] || [];
                    const q = (modelQuery[provider.id] || '').toLowerCase().trim();
                    const filtered = q ? list.filter(m => m.toLowerCase().includes(q)) : list;
                    if (!filtered.length) {
                      return (
                        <div className="px-2 py-1 text-xs text-gray-400">No models match</div>
                      );
                    }
                    return filtered.map((m) => {
                      const checked = selectedPairs.some(p => p.providerId === provider.id && p.modelId === m);
                      const brandSlugs = brandSlugsForModel(provider.id, m);
                      const slugs = brandSlugs?.length ? brandSlugs : providerSlugs(provider.id);
                      return (
                        <label key={m} className="flex items-center gap-2 px-2 py-1 text-sm text-gray-200 hover:bg-white/5">
                          <input
                            type="checkbox"
                            className="accent-cyan-400"
                            checked={checked}
                            onChange={(e) => handleToggleModel(provider.id, m, e.target.checked)}
                          />
                          <IconImg slugs={slugs} alt="brand" className="w-3.5 h-3.5 rounded-sm opacity-80" />
                          <span className="truncate" title={m}>{formatModelLabel(m)}</span>
                        </label>
                      );
                    });
                  })()}
                </div>
                {/* Enable toggle and saved chip */}
                <div className="mt-2 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-gray-300">
                    <input
                      type="checkbox"
                      className="accent-cyan-400"
                      checked={enabledByProvider[provider.id] ?? true}
                      onChange={(e) => handleToggleEnabled(provider.id, e.target.checked)}
                    />
                    Enable for race
                  </label>
                  {savedFlash[provider.id] && (
                    <span className="text-green-400 text-xs">Saved ✓</span>
                  )}
                </div>
              </div>
            ) : null)}
          </li>
        ))}
      </ul>
      {modalOpenFor && (
        <ApiKeyModal
          isOpen={!!modalOpenFor}
          onClose={() => setModalOpenFor(null)}
          providerName={modalOpenFor.displayName}
          onSave={handleSaveApiKey}
        />
      )}
    </div>
  );
};

export default ProviderList;
