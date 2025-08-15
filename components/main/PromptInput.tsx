// components/main/PromptInput.tsx
import React from 'react';
import GlassCard from '../layout/GlassCard';

interface PromptInputProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  disabled?: boolean;
  onReset?: () => void;
}

const PromptInput: React.FC<PromptInputProps> = ({
  prompt,
  onPromptChange,
  onSubmit,
  isLoading,
  disabled,
  onReset,
}) => {
  return (
    <GlassCard className="p-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <label htmlFor="prompt-input" className="sr-only">Prompt</label>
        <textarea
          id="prompt-input"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              if (!disabled && !isLoading && prompt) onSubmit();
            }
          }}
          className="input-glass w-full max-w-[720px] resize-none"
          placeholder="Write a prompt… (Cmd/Ctrl+Enter)"
          aria-label="Enter prompt"
        />
        <div className="flex items-center gap-2 md:self-stretch md:items-stretch md:ml-auto">
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="btn-secondary text-xs"
              disabled={isLoading}
            >
              Reset
            </button>
          )}
          <button
            onClick={onSubmit}
            disabled={!!disabled || isLoading || !prompt}
            className="btn btn-primary text-sm"
          >
            {isLoading ? 'Running…' : 'Start'}
          </button>
        </div>
      </div>
    </GlassCard>
  );
};

export default PromptInput;

