import React, { useEffect, useMemo, useRef } from 'react';
import GlassCard from '../layout/GlassCard';
import { measurePromptCharacters } from '../../utils/promptCharacters';

interface PromptInputProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

const PromptInput: React.FC<PromptInputProps> = ({
  prompt,
  onPromptChange,
  onSubmit,
  isLoading,
  disabled,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [counterReady, setCounterReady] = React.useState(false);
  useEffect(() => setCounterReady(true), []);
  const counter = useMemo(() => measurePromptCharacters(prompt), [prompt]);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 120)}px`;
  }, [prompt]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        textareaRef.current?.focus();
        textareaRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const canSubmit = !disabled && !isLoading && prompt.trim().length > 0;

  const buttonTitle = !prompt.trim()
    ? 'Enter a prompt to start'
    : isLoading
      ? 'Race in progress'
      : disabled
        ? 'Select a model and add its API key'
        : 'Start race with prompt';

  return (
    <GlassCard className="prompt-card p-3" hover={false} spotlight={false}>
      <label htmlFor="prompt-input" className="mb-2 block text-xs font-medium text-zinc-500">
        Prompt
      </label>
      <textarea
        id="prompt-input"
        ref={textareaRef}
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (canSubmit) onSubmit();
          } else if (event.key === 'Escape' && prompt.length > 0 && !isLoading) {
            onPromptChange('');
          }
        }}
        className="input-glass min-h-12 max-h-[120px] w-full resize-none overflow-y-auto text-sm leading-5 scrollbar-none"
        placeholder="Write a prompt. Shift+Enter adds a line."
        aria-label="Enter prompt"
        aria-describedby="prompt-hint"
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        data-form-type="other"
        data-lpignore="true"
        data-1p-ignore="true"
        enterKeyHint="go"
        dir="auto"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span id="prompt-hint" className="text-xs text-zinc-600 flex items-center gap-1.5">
          <span>Enter starts race.</span>
          <kbd
            className="hidden sm:inline-block px-1 py-0.5 text-[10px] font-mono rounded bg-white/5 border border-white/10 text-zinc-400 select-none"
            title="Press Ctrl+L or ⌘L to focus prompt"
          >
            ⌘L
          </kbd>
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {prompt.length > 0 && !isLoading && (
            <button
              type="button"
              onClick={() => onPromptChange('')}
              aria-label="Clear prompt text"
              title="Clear prompt (Esc)"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors p-0.5 rounded focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              Clear
            </button>
          )}
          {counterReady && prompt.length > 0 && (
            <span className="text-xs font-mono text-zinc-500" aria-label={counter.label}>
              {counter.count.toLocaleString()} {counter.shortUnit}{counter.count === 1 ? '' : 's'}
            </span>
          )}
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            aria-label="Start Race"
            title={buttonTitle}
            className="inline-flex min-h-[var(--control-h)] items-center gap-1 rounded-md bg-cyan-500/20 px-2.5 py-1 text-xs font-semibold text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current" aria-hidden="true">
              <path d="M5 3l14 9-14 9V3z" />
            </svg>
            <span>Start</span>
          </button>
        </div>
      </div>
    </GlassCard>
  );
};

export default PromptInput;
