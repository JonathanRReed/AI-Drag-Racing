// @vitest-environment happy-dom
import React from 'react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProviderList from '../components/sidebar/ProviderList';
import { providerSlugs } from '../utils/providerIcons';
import { fetchModels } from '../utils/fetchModels';
import { click, inputValue, mount } from './reactDom';

vi.mock('../utils/providerIcons', async importOriginal => {
  const actual = await importOriginal<typeof import('../utils/providerIcons')>();
  return { ...actual, providerSlugs: vi.fn(actual.providerSlugs) };
});
vi.mock('../utils/fetchModels', async importOriginal => {
  const actual = await importOriginal<typeof import('../utils/fetchModels')>();
  return { ...actual, fetchModels: vi.fn(async () => { throw new Error('Synthetic test failure'); }) };
});
let view: ReturnType<typeof mount>;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.clear(); sessionStorage.clear(); vi.clearAllMocks();
  localStorage.setItem('openai_models', JSON.stringify(['gpt-alpha', 'gpt-beta']));
  localStorage.setItem('anthropic_models', JSON.stringify(['gpt-alpha']));
});
afterEach(() => { view?.unmount(); document.body.innerHTML = ''; vi.unstubAllGlobals(); });
const search = () => view.container.querySelector<HTMLInputElement>('input[aria-label="Search models for OpenAI"]')!;
const modelCheckbox = (provider: string, model: string) => {
  const searchInput = view.container.querySelector(`input[aria-label="Search models for ${provider}"]`)!;
  const card = searchInput.closest('li')!;
  const label = Array.from(card.querySelectorAll('label')).find(l => l.textContent === model)!;
  return label.querySelector<HTMLInputElement>('input')!;
};

describe('provider picker', () => {
  it('keeps same-name models scoped by provider and updates controlled selections', () => {
    const dispatch = vi.fn();
    const apiKeys = { openai: 'synthetic-key', anthropic: 'synthetic-key' };
    view = mount(<ProviderList apiKeys={apiKeys} dispatch={dispatch} selectedPairs={[{ providerId: 'openai', modelId: 'gpt-alpha' }]} />);
    expect(modelCheckbox('OpenAI', 'gpt-alpha').checked).toBe(true);
    expect(modelCheckbox('Anthropic', 'gpt-alpha').checked).toBe(false);
    view.rerender(<ProviderList apiKeys={apiKeys} dispatch={dispatch} selectedPairs={[{ providerId: 'anthropic', modelId: 'gpt-alpha' }]} />);
    expect(modelCheckbox('OpenAI', 'gpt-alpha').checked).toBe(false);
    expect(modelCheckbox('Anthropic', 'gpt-alpha').checked).toBe(true);
    click(modelCheckbox('OpenAI', 'gpt-beta'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_MODEL_SELECTION', payload: { providerId: 'openai', modelId: 'gpt-beta' } });
    expect(JSON.parse(localStorage.getItem('openai_selected_models')!)).toEqual(['gpt-beta']);
  });

  it('does not render provider header icons again when only a model search changes', () => {
    view = mount(<ProviderList apiKeys={{ openai: 'synthetic-key' }} dispatch={vi.fn()} selectedPairs={[]} />);
    vi.mocked(providerSlugs).mockClear();
    inputValue(search(), 'alpha');
    expect(modelCheckbox('OpenAI', 'gpt-alpha')).toBeTruthy();
    expect(search().closest('li')!.textContent).not.toContain('gpt-beta');
    expect(providerSlugs).not.toHaveBeenCalled();
  });

  it('labels and clears the targeted provider key and selections', () => {
    const dispatch = vi.fn();
    view = mount(<ProviderList apiKeys={{ openai: 'synthetic-key' }} dispatch={dispatch} selectedPairs={[]} />);
    const clear = view.container.querySelector<HTMLButtonElement>('button[aria-label="Clear API key for OpenAI"]');
    expect(clear).not.toBeNull();
    expect(clear!.type).toBe('button');
    expect(clear!.className).toContain('focus-visible:ring-2');
    click(clear!);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_API_KEY', payload: { providerId: 'openai', apiKey: '' } });
    expect(dispatch).toHaveBeenCalledWith({ type: 'CLEAR_PROVIDER_SELECTIONS', payload: { providerId: 'openai' } });
    expect(localStorage.getItem('openai_models')).toBeNull();
  });

  it('identifies the provider when retrying a failed model list', async () => {
    localStorage.clear();
    view = mount(<ProviderList apiKeys={{ openai: 'synthetic-key' }} dispatch={vi.fn()} selectedPairs={[]} />);
    await act(async () => { await Promise.resolve(); });
    const retry = view.container.querySelector<HTMLButtonElement>('button[aria-label="Retry model list for OpenAI"]');
    expect(retry).not.toBeNull();
    expect(retry!.title).toBe('Retry model list for OpenAI');
    vi.mocked(fetchModels).mockClear();
    await act(async () => { retry!.click(); await Promise.resolve(); });
    expect(fetchModels).toHaveBeenCalledExactlyOnceWith('openai', 'synthetic-key');
  });

  it('includes accessible aria-label on enable checkbox and decorative attributes on model icons', () => {
    view = mount(<ProviderList apiKeys={{ openai: 'synthetic-key' }} dispatch={vi.fn()} selectedPairs={[]} />);
    const enableCheckbox = view.container.querySelector<HTMLInputElement>('input[aria-label="Enable OpenAI for race"]');
    expect(enableCheckbox).not.toBeNull();

    const modelIcon = view.container.querySelector<HTMLImageElement>('label img');
    expect(modelIcon).not.toBeNull();
    expect(modelIcon!.getAttribute('alt')).toBe('');
    expect(modelIcon!.getAttribute('aria-hidden')).toBe('true');
  });
});
