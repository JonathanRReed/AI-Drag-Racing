// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RaceSettings, { RaceConfig } from '../components/sidebar/RaceSettings';
import { click, mount } from './reactDom';

let view: ReturnType<typeof mount>;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
});
afterEach(() => {
  view?.unmount();
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

const defaultConfig: RaceConfig = {
  mode: 'drag',
  modelSettings: {
    temperature: 0.7,
    maxTokens: 1000,
    topP: 0.9,
  },
};

describe('RaceSettings range input focus states and accessibility', () => {
  it('renders range inputs with focus-visible ring styles and cursor-pointer', () => {
    const onChange = vi.fn();
    view = mount(<RaceSettings config={defaultConfig} onChange={onChange} />);

    // Expand the RaceSettings panel
    const headerButton = view.container.querySelector('button[aria-controls="race-settings-content"]');
    expect(headerButton).not.toBeNull();
    click(headerButton!);

    // Query all range inputs
    const rangeInputs = Array.from(view.container.querySelectorAll<HTMLInputElement>('input[type="range"]'));
    expect(rangeInputs.length).toBeGreaterThanOrEqual(3); // temperature, maxTokens, topP

    for (const input of rangeInputs) {
      expect(input.className).toContain('focus-visible:ring-2');
      expect(input.className).toContain('focus-visible:ring-emerald-400');
      expect(input.className).toContain('cursor-pointer');
      expect(input.getAttribute('aria-valuetext')).toBeTruthy();
    }
  });

  it('renders mode-specific range input with focus-visible ring styles in token_limit mode', () => {
    const onChange = vi.fn();
    const tokenConfig: RaceConfig = {
      ...defaultConfig,
      mode: 'token_limit',
      tokenLimit: 500,
    };
    view = mount(<RaceSettings config={tokenConfig} onChange={onChange} />);

    const headerButton = view.container.querySelector('button[aria-controls="race-settings-content"]');
    click(headerButton!);

    const tokenInput = view.container.querySelector<HTMLInputElement>('input#race-token-limit');
    expect(tokenInput).not.toBeNull();
    expect(tokenInput!.className).toContain('focus-visible:ring-2');
    expect(tokenInput!.className).toContain('focus-visible:ring-emerald-400');
    expect(tokenInput!.className).toContain('cursor-pointer');
  });

  it('renders mode-specific range input with focus-visible ring styles in time_limit mode', () => {
    const onChange = vi.fn();
    const timeConfig: RaceConfig = {
      ...defaultConfig,
      mode: 'time_limit',
      timeLimit: 30,
    };
    view = mount(<RaceSettings config={timeConfig} onChange={onChange} />);

    const headerButton = view.container.querySelector('button[aria-controls="race-settings-content"]');
    click(headerButton!);

    const timeInput = view.container.querySelector<HTMLInputElement>('input#race-time-limit');
    expect(timeInput).not.toBeNull();
    expect(timeInput!.className).toContain('focus-visible:ring-2');
    expect(timeInput!.className).toContain('focus-visible:ring-emerald-400');
    expect(timeInput!.className).toContain('cursor-pointer');
  });
});
