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

  return (
    <GlassCard className="prompt-card p-3" hover={false} spotlight={false}>
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor="prompt-input" className="text-xs font-medium text-zinc-500">
          Prompt
        </label>
        <kbd
          className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 select-none"
          aria-label="Keyboard shortcut: Command or Control plus L to focus prompt"
          title="Press ⌘L or Ctrl+L to focus prompt input"
        >
          ⌘L / Ctrl+L
        </kbd>
      </div>
      <textarea
        id="prompt-input"
        ref={textareaRef}
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (canSubmit) onSubmit();
          }
        }}
        className="input-glass min-h-12 max-h-[120px] w-full resize-none overflow-y-auto text-sm leading-5 scrollbar-none"
        placeholder="Write a prompt. Shift+Enter adds a line."
        aria-label="Enter prompt"
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
        <span className="text-xs text-zinc-600">Enter starts the race when racers are ready. Shift+Enter adds a line.</span>
        {counterReady && prompt.length > 0 && (
          <span className="text-xs font-mono text-zinc-500 shrink-0" aria-label={counter.label}>
            {counter.count.toLocaleString()} {counter.shortUnit}{counter.count === 1 ? '' : 's'}
          </span>
        )}
      </div>
    </GlassCard>
  );
};

export default PromptInput;
