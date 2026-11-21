// components/sidebar/ApiKeyModal.tsx
import React, { useEffect, useRef, useState } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerName: string;
  onSave: (apiKey: string) => void;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  providerName,
  onSave,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Security hygiene: Reset input state whenever the modal opens or closes to
  // prevent sensitive API key strings from lingering in component React state/DOM.
  useEffect(() => {
    setApiKey('');
    setShowKey(false);
    if (!isOpen) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => {
      const target = returnFocusRef.current;
      if (target && typeof target.focus === 'function' && target.isConnected) {
        target.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) return;
    onSave(trimmed);
    // Immediately clear sensitive key from local component state after saving.
    setApiKey('');
    setShowKey(false);
    onClose();
  };

  // Escape closes the dialog. Tab cycles inside it so the page behind stays
  // out of reach while the dialog is up.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (!nodes || nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;
    const inside = active instanceof Node && dialogRef.current?.contains(active);
    if (event.shiftKey) {
      if (!inside || active === first) {
        event.preventDefault();
        last.focus();
      }
      return;
    }
    if (!inside || active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="modal-scrim"
      onKeyDown={handleKeyDown}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-key-modal-heading"
        aria-describedby="api-key-modal-description"
        className="modal-panel"
      >
        <button
          type="button"
          onClick={onClose}
          className="modal-close focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus"
          aria-label="Close dialog"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 id="api-key-modal-heading" className="modal-title">
          Enter API Key for {providerName}
        </h2>
        <p id="api-key-modal-description" className="modal-copy">
          Your API key is kept only for this browser tab, and closing the tab clears it. When you run a race, the key goes through the site&apos;s server-side proxy to the provider and is never saved in a race record.
        </p>
        <label htmlFor="apiKey" className="eco-label mb-1">
          API key
        </label>
        <div className="relative">
          <input
            id="apiKey"
            ref={inputRef}
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            className="input-glass pr-11 font-mono"
            placeholder="sk-..."
          />
          <button
            type="button"
            onClick={() => setShowKey(value => !value)}
            className="modal-reveal focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus"
            aria-label={showKey ? 'Hide API key' : 'Show API key'}
            title={showKey ? 'Hide API key' : 'Show API key'}
            aria-pressed={showKey}
          >
            {showKey ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M1 1l22 22" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        <div className="modal-actions">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!apiKey.trim()}
            className="modal-save focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus"
          >
            Save Key
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
