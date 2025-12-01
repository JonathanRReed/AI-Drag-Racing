// components/sidebar/RaceSettings.tsx
import React, { useState } from 'react';
import GlassCard from '../layout/GlassCard';

export type RaceMode = 'drag' | 'token_limit' | 'time_limit' | 'free_for_all';

export interface ModelSettings {
  temperature: number;
  maxTokens: number;
  topP: number;
}

export interface RaceConfig {
  mode: RaceMode;
  tokenLimit?: number; // for token_limit mode
  timeLimit?: number; // for time_limit mode (seconds)
  modelSettings: ModelSettings;
}

interface RaceSettingsProps {
  config: RaceConfig;
  onChange: (config: RaceConfig) => void;
}

const RACE_MODES: { id: RaceMode; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: 'drag',
    label: 'Drag Race',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    description: 'Race to completion - first to finish wins',
  },
  {
    id: 'token_limit',
    label: 'Token Sprint',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 9h6M9 12h6M9 15h4" strokeLinecap="round" />
      </svg>
    ),
    description: 'Race to generate X tokens',
  },
  {
    id: 'time_limit',
    label: 'Time Trial',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" strokeLinecap="round" />
      </svg>
    ),
    description: 'See who outputs most in X seconds',
  },
  {
    id: 'free_for_all',
    label: 'Free Run',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12h8M12 8v8" strokeLinecap="round" />
      </svg>
    ),
    description: 'No limits - complete freedom',
  },
];

const RaceSettings: React.FC<RaceSettingsProps> = ({ config, onChange }) => {
  const [expanded, setExpanded] = useState(false);

  const updateMode = (mode: RaceMode) => {
    onChange({ ...config, mode });
  };

  const updateModelSettings = (key: keyof ModelSettings, value: number) => {
    onChange({
      ...config,
      modelSettings: { ...config.modelSettings, [key]: value },
    });
  };

  return (
    <GlassCard className="p-3">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center ring-1 ring-purple-500/20">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-medium text-white">Race Settings</span>
            <span className="text-[10px] text-[var(--text-muted)] block">
              {RACE_MODES.find(m => m.id === config.mode)?.label}
            </span>
          </div>
        </div>
        <svg
          viewBox="0 0 24 24"
          className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Race Mode Selection */}
          <div>
            <label className="block text-xs uppercase tracking-wide text-[var(--text-muted)] mb-2">
              Race Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              {RACE_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => updateMode(mode.id)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    config.mode === mode.id
                      ? 'bg-purple-500/15 border-purple-500/40 ring-1 ring-purple-500/20'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={config.mode === mode.id ? 'text-purple-400' : 'text-[var(--text-muted)]'}>
                      {mode.icon}
                    </span>
                    <span className={`text-xs font-medium ${config.mode === mode.id ? 'text-white' : 'text-[var(--text)]'}`}>
                      {mode.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] leading-tight">
                    {mode.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Mode-specific settings */}
          {config.mode === 'token_limit' && (
            <div>
              <label className="block text-xs uppercase tracking-wide text-[var(--text-muted)] mb-2">
                Token Limit
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="50"
                  max="2000"
                  step="50"
                  value={config.tokenLimit || 500}
                  onChange={(e) => onChange({ ...config, tokenLimit: parseInt(e.target.value) })}
                  className="flex-1 accent-purple-400"
                />
                <span className="text-sm text-white font-mono w-16 text-right">
                  {config.tokenLimit || 500}
                </span>
              </div>
            </div>
          )}

          {config.mode === 'time_limit' && (
            <div>
              <label className="block text-xs uppercase tracking-wide text-[var(--text-muted)] mb-2">
                Time Limit (seconds)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={config.timeLimit || 30}
                  onChange={(e) => onChange({ ...config, timeLimit: parseInt(e.target.value) })}
                  className="flex-1 accent-purple-400"
                />
                <span className="text-sm text-white font-mono w-12 text-right">
                  {config.timeLimit || 30}s
                </span>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-white/10 pt-4">
            <label className="block text-xs uppercase tracking-wide text-[var(--text-muted)] mb-3">
              Model Parameters
            </label>

            {/* Temperature */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--text)]">Temperature</span>
                <span className="text-xs text-[var(--text-muted)] font-mono">
                  {config.modelSettings.temperature.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={config.modelSettings.temperature}
                onChange={(e) => updateModelSettings('temperature', parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
              <div className="flex justify-between text-[9px] text-[var(--text-muted)]">
                <span>Focused</span>
                <span>Creative</span>
              </div>
            </div>

            {/* Max Tokens */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--text)]">Max Tokens</span>
                <span className="text-xs text-[var(--text-muted)] font-mono">
                  {config.modelSettings.maxTokens}
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="4096"
                step="100"
                value={config.modelSettings.maxTokens}
                onChange={(e) => updateModelSettings('maxTokens', parseInt(e.target.value))}
                className="w-full accent-cyan-400"
              />
              <div className="flex justify-between text-[9px] text-[var(--text-muted)]">
                <span>100</span>
                <span>4096</span>
              </div>
            </div>

            {/* Top P */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--text)]">Top P</span>
                <span className="text-xs text-[var(--text-muted)] font-mono">
                  {config.modelSettings.topP.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.modelSettings.topP}
                onChange={(e) => updateModelSettings('topP', parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
              <div className="flex justify-between text-[9px] text-[var(--text-muted)]">
                <span>Narrow</span>
                <span>Diverse</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
};

export default RaceSettings;
