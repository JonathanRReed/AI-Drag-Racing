// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RaceSettings, { type RaceConfig } from '../components/sidebar/RaceSettings';
import { click, inputValue, mount } from './reactDom';

let view: ReturnType<typeof mount> | undefined;
beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true));
afterEach(() => {
  view?.unmount();
  view = undefined;
  vi.unstubAllGlobals();
});

const sliders = [
  { id: 'race-token-limit', label: 'Token limit', mode: 'token_limit', min: '50', max: '2000', step: '50', value: '500', text: '500 tokens', next: '750', patch: { tokenLimit: 750 } },
  { id: 'race-time-limit', label: 'Time limit (seconds)', mode: 'time_limit', min: '5', max: '120', step: '5', value: '30', text: '30 seconds', next: '45', patch: { timeLimit: 45 } },
  { id: 'race-temperature', label: 'Temperature', mode: 'drag', min: '0', max: '2', step: '0.1', value: '0.7', text: '0.70 of 2', next: '1.2', patch: { modelSettings: { temperature: 1.2, maxTokens: 1000, topP: 0.9 } } },
  { id: 'race-max-tokens', label: 'Max tokens', mode: 'drag', min: '100', max: '4096', step: '100', value: '1000', text: '1000 tokens', next: '1500', patch: { modelSettings: { temperature: 0.7, maxTokens: 1500, topP: 0.9 } } },
  { id: 'race-top-p', label: 'Top P', mode: 'drag', min: '0', max: '1', step: '0.05', value: '0.9', text: '0.90 of 1', next: '0.75', patch: { modelSettings: { temperature: 0.7, maxTokens: 1000, topP: 0.75 } } },
] as const;

function setup(mode: RaceConfig['mode']) {
  const config: RaceConfig = { mode, tokenLimit: 500, timeLimit: 30, modelSettings: { temperature: 0.7, maxTokens: 1000, topP: 0.9 } };
  const onChange = vi.fn();
  view = mount(<RaceSettings config={config} onChange={onChange} />);
  click(view.container.querySelector<HTMLButtonElement>('button[aria-controls="race-settings-content"]')!);
  return { config, onChange, container: view.container };
}

describe('RaceSettings slider accessibility', () => {
  it.each(sliders)('gives $label a keyboard-focus indicator and named native range semantics', (slider) => {
    const { container } = setup(slider.mode);
    const input = container.querySelector<HTMLInputElement>(`#${slider.id}`)!;
    expect(input).not.toBeNull();
    expect(input.type).toBe('range');
    expect(input.labels?.[0]?.textContent?.trim()).toBe(slider.label);
    expect(input.disabled).toBe(false);
    expect(input.tabIndex).toBe(0);
    expect([input.min, input.max, input.step, input.value]).toEqual([slider.min, slider.max, slider.step, slider.value]);
    expect(input.getAttribute('aria-valuetext')).toBe(slider.text);
    // DOM contract only: actual Tab focus and painted ring require browser QA.
    for (const className of ['focus-visible:outline-hidden', 'focus-visible:ring-2', 'focus-visible:ring-emerald-400']) {
      expect(input.classList.contains(className), `${slider.label} needs ${className}`).toBe(true);
    }
  });

  it.each(sliders)('updates $label without losing the remaining race configuration', (slider) => {
    const { config, onChange, container } = setup(slider.mode);
    inputValue(container.querySelector<HTMLInputElement>(`#${slider.id}`)!, slider.next);
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ ...config, ...slider.patch });
  });
});
