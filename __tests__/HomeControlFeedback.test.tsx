// @vitest-environment happy-dom
import React, { act } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Home from '../pages/index';
import { click, mount } from './reactDom';

vi.mock('next/router', () => ({ useRouter: () => ({ pathname: '/', query: {}, replace: vi.fn() }) }));
vi.mock('next/head', () => ({ default: () => null }));
let view: ReturnType<typeof mount>;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('No network in control-feedback test'); }));
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  localStorage.clear(); sessionStorage.clear();
});
afterEach(() => {
  view?.unmount();
  vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks();
  localStorage.clear(); sessionStorage.clear();
});

it.each([0, 0.5, 0.999])('connects real Home countdown, racing and completion feedback without provider calls (jitter=%s)', async jitter => {
  vi.mocked(Math.random).mockReturnValue(jitter);
  await act(async () => { view = mount(<Home />); });
  const start = view.container.querySelector<HTMLButtonElement>('button[aria-label="Start Race"]')!;
  const feedback = () => document.getElementById(start.getAttribute('aria-describedby') ?? '')?.textContent;
  expect(feedback()).toBe('Select a model from an enabled provider with an API key');
  click([...view.container.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === 'Run a demo race')!);
  expect(feedback()).toBe('Countdown in progress');
  expect(start.disabled).toBe(true);
  await act(async () => { await vi.advanceTimersByTimeAsync(2400); });
  expect(feedback()).toBe('Race in progress');
  expect(start.disabled).toBe(true);
  // The slowest demo lane needs 62 chunks, each below 120ms, after 640ms TTFT.
  // Wait for completion within 10 simulated seconds, not an assumed average duration.
  for (let elapsed = 0; elapsed < 10_000 && feedback() === 'Race in progress'; elapsed += 100) {
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
  }
  expect(feedback()).toBe('Select a model from an enabled provider with an API key');
  expect(fetch).not.toHaveBeenCalled();
});

it('mentions provider enablement when an otherwise configured model cannot start', async () => {
  localStorage.setItem('openai_models', JSON.stringify(['gpt-4o']));
  localStorage.setItem('openai_selected_models', JSON.stringify(['gpt-4o']));
  sessionStorage.setItem('openai_api_key', 'synthetic-test-key');
  await act(async () => { view = mount(<Home />); });
  const start = view.container.querySelector<HTMLButtonElement>('button[aria-label="Start Race"]')!;
  expect(start.disabled).toBe(false);
  const enable = view.container.querySelector<HTMLInputElement>('input[aria-label="Enable OpenAI for race"]')!;
  click(enable);
  expect(start.disabled).toBe(true);
  const feedback = document.getElementById(start.getAttribute('aria-describedby') ?? '');
  expect(feedback?.textContent).toContain('enabled provider');
  click(enable);
  expect(start.disabled).toBe(false);
  expect(start.hasAttribute('aria-describedby')).toBe(false);
  expect(fetch).not.toHaveBeenCalled();
});
