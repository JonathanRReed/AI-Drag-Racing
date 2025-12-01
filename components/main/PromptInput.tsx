// components/main/PromptInput.tsx
import React, { useEffect, useRef, useState } from 'react';
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
  const inputRef = useRef<HTMLInputElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [expanded, setExpanded] = useState(false);
  const isLoadingRef = useRef(isLoading);

  // Keep freshest loading state and collapse overlay when a run starts
  useEffect(() => {
    isLoadingRef.current = isLoading;
    if (isLoading) setExpanded(false);
  }, [isLoading]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Cmd/Ctrl + L focuses the prompt like a browser URL bar
      if ((e.metaKey || e.ctrlKey) && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        if (!isLoadingRef.current) {
          setExpanded(true);
          requestAnimationFrame(() => {
            taRef.current?.focus();
            taRef.current?.select();
          });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Auto-resize textarea height to content when expanded
  useEffect(() => {
    if (!expanded || !taRef.current) return;
    const el = taRef.current;
    const resize = () => {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, window.innerHeight * 0.4) + 'px';
    };
    resize();
    const onInput = () => resize();
    el.addEventListener('input', onInput);
    return () => el.removeEventListener('input', onInput);
  }, [expanded, prompt]);

  // Click-outside to close popover
  useEffect(() => {
    if (!expanded) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popRef.current && !popRef.current.contains(target) && inputRef.current && !inputRef.current.contains(target)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [expanded]);

  return (
    <>
    <GlassCard className="p-3 relative">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <label htmlFor="prompt-input" className="sr-only">Prompt</label>
        <input
          id="prompt-input"
          type="text"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onFocus={(e) => {
            e.currentTarget.select();
            if (!isLoadingRef.current) {
              setExpanded(true);
              requestAnimationFrame(() => {
                taRef.current?.focus();
                taRef.current?.select();
              });
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || ((e.metaKey || e.ctrlKey) && e.key === 'Enter')) {
              e.preventDefault();
              if (!disabled && !isLoading && prompt) onSubmit();
            }
          }}
          ref={inputRef}
          className={`input-glass w-full md:flex-1 md:min-w-0 whitespace-nowrap overflow-x-auto scrollbar-none ${
            !isLoading ? 'transform-gpu transition-[transform,box-shadow,background-color,height] focus:h-11 focus:scale-[1.02] focus:shadow-[0_0_0_6px_rgba(34,211,238,0.12)] focus:ring-2 focus:ring-[#22D3EE]/70 focus:ring-offset-2 focus:ring-offset-[#07090D]' : ''
          }`}
          placeholder="Write a prompt... Press Enter to start"
          aria-label="Enter prompt"
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          data-form-type="other"
          data-lpignore="true"
          data-1p-ignore="true"
          inputMode="text"
          enterKeyHint="go"
          dir="auto"
          title={prompt}
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
            className="btn btn-primary text-sm group relative overflow-hidden"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Racing...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-cyan-300 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Start Race
              </>
            )}
          </button>
        </div>
      </div>
      {/* Readable popover (multi-line) directly under the bar; no layout shift */}
      {expanded && !isLoadingRef.current && (
        <div ref={popRef} className="absolute left-0 right-0 top-full mt-2 z-30">
          <div className="glass-card p-2 ring-1 ring-white/10">
            <textarea
              ref={taRef}
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setExpanded(false);
                  inputRef.current?.focus();
                  return;
                }
                if (e.key === 'Enter' || ((e.metaKey || e.ctrlKey) && e.key === 'Enter')) {
                  e.preventDefault();
                  if (!disabled && !isLoadingRef.current && prompt) {
                    onSubmit();
                    setExpanded(false);
                  }
                }
              }}
              className="w-full resize-none bg-transparent text-[15px] leading-[1.35] text-white placeholder-[rgba(230,231,235,0.64)] outline-none scrollbar-none min-h-[44px] max-h-[40vh] px-2 py-1"
              placeholder="Write a prompt..."
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              data-form-type="other"
              data-lpignore="true"
              data-1p-ignore="true"
              dir="auto"
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => {
                  setExpanded(false);
                  inputRef.current?.focus();
                }}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary text-xs"
                onClick={() => {
                  if (!disabled && !isLoadingRef.current && prompt) {
                    onSubmit();
                    setExpanded(false);
                  }
                }}
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-cyan-300" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Start Race
              </button>
            </div>
          </div>
        </div>
      )}
    </GlassCard>
    {/* Inline mode only - no overlay */}
    </>
  );
};

export default PromptInput;

