// components/sidebar/ApiKeyModal.tsx
import React, { useState } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerName: string;
  onSave: (apiKey: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  providerName,
  onSave,
}) => {
  const [apiKey, setApiKey] = useState('');

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    onSave(apiKey.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="glass-card p-6 w-[min(92vw,28rem)] m-4">
        <h2 className="text-2xl font-bold text-white mb-4 leading-tight">
          Enter API Key for {providerName}
        </h2>
        <p className="text-gray-400 mb-4 text-sm">
          Your API key is stored in your browser (localStorage). For each request, it is sent to our server-side Edge Function only to proxy the call to the provider and is never persisted server-side.
        </p>
        <label htmlFor="apiKey" className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
          API Key
        </label>
        <input
          id="apiKey"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          placeholder="sk-..."
        />
        <div className="flex justify-end space-x-4 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-gray-300 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-md bg-cyan-500 text-white font-semibold hover:bg-cyan-600 transition-colors shadow-[0_0_15px_rgba(56,189,248,0.3)]"
          >
            Save Key
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
