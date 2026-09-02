import React, { useEffect, useRef } from 'react';
import GlassCard from '../layout/GlassCard';

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
      <label htmlFor="prompt-input" className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
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
        <span className="text-[10px] text-zinc-600">Enter starts the race when racers are ready. Shift+Enter adds a line.</span>
      </div>
    </GlassCard>
  );
};

export default PromptInput;
