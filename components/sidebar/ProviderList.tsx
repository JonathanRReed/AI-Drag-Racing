// components/sidebar/ProviderList.tsx
import React, { useState, useMemo } from 'react';
import { PROVIDERS, ProviderConfig } from '../../utils/providers';
import ApiKeyModal from './ApiKeyModal';

// Icons
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;


interface ProviderListItemProps {
  provider: ProviderConfig;
  hasApiKey: boolean;
  onAddKey: () => void;
}

const ProviderListItem: React.FC<ProviderListItemProps> = ({ provider, hasApiKey, onAddKey }) => {
  return (
    <li className="flex items-center justify-between p-2 rounded-lg hover:bg-white/10 transition-colors duration-200">
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-200">{provider.displayName}</span>
        {hasApiKey && <CheckIcon />}
      </div>
      <button
        onClick={onAddKey}
        className="p-1 rounded-md text-gray-400 hover:bg-white/20 hover:text-white transition-colors"
        aria-label={`${hasApiKey ? 'Edit' : 'Add'} API key for ${provider.displayName}`}
      >
        {/* We can improve this button to show an edit icon if key exists */}
        <PlusIcon />
      </button>
    </li>
  );
};

interface ProviderListProps {
  apiKeys: Record<string, string>;
  dispatch: React.Dispatch<any>; // Using 'any' for simplicity, could be typed with AppAction
}

const ProviderList: React.FC<ProviderListProps> = ({ apiKeys, dispatch }) => {
  const [modalOpenFor, setModalOpenFor] = useState<ProviderConfig | null>(null);

  const handleSaveApiKey = (apiKey: string) => {
    if (modalOpenFor) {
      dispatch({
        type: 'SET_API_KEY',
        payload: { providerId: modalOpenFor.id, apiKey }
      });
      // Also save to localStorage for persistence
      localStorage.setItem(`${modalOpenFor.id}_api_key`, apiKey);
    }
  };

  // On component mount, load keys from localStorage
  React.useEffect(() => {
    PROVIDERS.forEach(p => {
      const savedKey = localStorage.getItem(`${p.id}_api_key`);
      if (savedKey) {
        dispatch({ type: 'SET_API_KEY', payload: { providerId: p.id, apiKey: savedKey } });
      }
    });
  }, [dispatch]);

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4 px-2">Providers</h2>
      <ul className="space-y-1">
        {PROVIDERS.map((provider) => (
          <ProviderListItem
            key={provider.id}
            provider={provider}
            hasApiKey={!!apiKeys[provider.id]}
            onAddKey={() => setModalOpenFor(provider)}
          />
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
