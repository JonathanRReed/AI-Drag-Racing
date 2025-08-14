// components/main/PromptInput.tsx
import React from 'react';
import GlassCard from '../layout/GlassCard';

interface PromptInputProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

const PromptInput: React.FC<PromptInputProps> = ({
  prompt,
  onPromptChange,
  onSubmit,
  isLoading,
}) => {
  return (
    <GlassCard className="p-4">
      <h2 className="text-lg font-semibold text-white mb-3">Enter Prompt</h2>
      <textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        className="w-full h-24 p-2 rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none"
        placeholder="e.g., Explain the theory of relativity in simple terms."
      />
      <div className="mt-4 flex justify-end">
        <button
          onClick={onSubmit}
          disabled={isLoading || !prompt}
          className="px-5 py-2 rounded-md bg-cyan-500 text-white font-semibold hover:bg-cyan-600 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(56,189,248,0.3)] disabled:shadow-none"
        >
          {isLoading ? 'Running...' : 'Run Comparison'}
        </button>
      </div>
    </GlassCard>
  );
};

export default PromptInput;
