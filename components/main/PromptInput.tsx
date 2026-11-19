import React, { useEffect, useId, useMemo, useRef } from 'react';
import GlassCard from '../layout/GlassCard';
import { measurePromptCharacters } from '../../utils/promptCharacters';

interface PromptInputProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  isCountingDown?: boolean;
  disabled?: boolean;
}

const PromptInput: React.FC<PromptInputProps> = ({
  prompt,
  onPromptChange,
  onSubmit,
  isLoading,
  isCountingDown = false,
  disabled,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const feedbackId = useId();
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

  const isBusy = isLoading || isCountingDown;
  const canSubmit = !disabled && !isBusy && prompt.trim().length > 0;

  const buttonTitle = isCountingDown
    ? 'Countdown in progress'
    : isLoading
      ? 'Race in progress'
      : !prompt.trim()
        ? disabled ? 'Enter a prompt and select a model from an enabled provider with an API key' : 'Enter a prompt to start'
        : disabled
          ? 'Select a model from an enabled provider with an API key'
          : 'Start race with prompt';

  return (
    <GlassCard className="prompt-card" hover={false} spotlight={false}>
      <label htmlFor="prompt-input" className="eco-label">
        Prompt
      </label>
      <textarea
        id="prompt-input"
        ref={textareaRef}
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        onKeyDown={(event) => {
          // IME confirmation/cancellation belongs to text entry, not race shortcuts.
          if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (canSubmit) onSubmit();
          } else if (event.key === 'Escape' && prompt.length > 0 && !isBusy) {
            onPromptChange('');
          }
        }}
        className="prompt-textarea scrollbar-none"
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
      <div className="prompt-row">
        <span id="prompt-hint" className="prompt-hint">Enter starts race. Shift+Enter adds line.</span>
        <div className="prompt-tools">
          {prompt.length > 0 && !isBusy && (
            <button
              type="button"
              onClick={() => onPromptChange('')}
              aria-label="Clear prompt text"
              title="Clear prompt (Esc)"
              className="prompt-clear"
            >
              Clear
            </button>
          )}
          {counterReady && prompt.length > 0 && (
            <span className="prompt-count" aria-label={counter.label}>
              {counter.count.toLocaleString()} {counter.shortUnit}{counter.count === 1 ? '' : 's'}
            </span>
          )}
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            aria-label="Start Race"
            aria-describedby={!canSubmit ? feedbackId : undefined}
            aria-busy={isBusy || undefined}
            title={buttonTitle}
            className="prompt-start"
          >
            {isBusy ? (
              <svg viewBox="0 0 24 24" className="animate-spin motion-reduce:animate-none" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
                <circle cx="12" cy="12" r="9" opacity="0.25" />
                <path d="M12 3a9 9 0 0 1 9 9" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
                <path d="M5 3l14 9-14 9V3z" />
              </svg>
            )}
            <span>Start</span>
          </button>
        </div>
      </div>
      {!canSubmit && (
        <p id={feedbackId} className="prompt-feedback">
          {buttonTitle}
        </p>
      )}
    </GlassCard>
  );
};

export default PromptInput;
