import React, { ChangeEvent, FormEvent } from 'react';

interface PromptInputProps {
  prompt: string;
  onPromptChange: (val: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export default function PromptInput({ prompt, onPromptChange, onSubmit, isLoading }: PromptInputProps) {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (prompt.trim()) {
      onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <textarea
        className="w-full glass-input rounded px-3 py-2 min-h-[80px] focus:outline-none transition-all duration-200 focus:ring-4 focus:ring-cyan-300/90 focus:shadow-[0_0_32px_8px_rgba(0,255,247,0.45)] hover:shadow-[0_0_32px_8px_rgba(0,255,247,0.45)] hover:ring-4 hover:ring-cyan-300/90"
        placeholder="Enter your prompt here..."
        value={prompt}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onPromptChange(e.target.value)}
        disabled={isLoading}
      />
      <div className="flex justify-end">
        <button
          type="submit"
          className="glass-button bg-cyan text-oled px-6 py-2 rounded font-semibold hover:bg-magenta transition"
          disabled={isLoading || !prompt.trim()}
        >
          {isLoading ? 'Running...' : 'Run Comparison'}
        </button>
      </div>
    </form>
  );
}
