// @vitest-environment happy-dom
import React from 'react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProviderList from '../components/sidebar/ProviderList';
import { providerSlugs } from '../utils/providerIcons';
import { fetchModels } from '../utils/fetchModels';
import { click, inputValue, key, mount } from './reactDom';

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
  vi.mocked(fetchModels).mockReset().mockRejectedValue(new Error('Synthetic test failure'));
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
  const listed = () => Array.from(search().closest('li')!.querySelectorAll('label span[title] > bdi:first-child'), span => span.textContent);
  const restored = (dispatch: ReturnType<typeof vi.fn>) => dispatch.mock.calls
    .map(([action]) => action).filter(action => action.type === 'TOGGLE_MODEL_SELECTION').map(action => action.payload.modelId);

  it('filters and deduplicates cached models and restored selections without changing exact IDs or order', () => {
    const models = ['gpt-alpha', 'Model', 'model', 'café', 'cafe\u0301', 'org/می\u200cروم', 'org/👩\u200d💻', 'vendor/模型:β+q4#tag', 'org/🏴\u{e0067}\u{e0062}\u{e0065}\u{e006e}\u{e0067}\u{e007f}', 'model\u0600id', 'x'.repeat(512)];
    const selected = [models[5], models[1], models[2], models[3], models[4], 'valid-but-not-in-cache'];
    const invalid = [null, 123, true, {}, [], '', ' model ', 'model\u0000', 'model\u0085', 'model\u2028id', 'x'.repeat(513)];
    localStorage.setItem('openai_models', JSON.stringify([...invalid, ...models, ...models]));
    localStorage.setItem('openai_selected_models', JSON.stringify([...invalid, ...selected, ...selected]));
    const dispatch = vi.fn();
    view = mount(<ProviderList apiKeys={{}} dispatch={dispatch} selectedPairs={[]} />);
    expect(restored(dispatch)).toEqual(selected);
    view.rerender(<ProviderList apiKeys={{ openai: 'synthetic-key' }} dispatch={dispatch} selectedPairs={[]} />);
    expect(listed()).toEqual(models);
    expect(JSON.parse(localStorage.getItem('openai_models')!)).toEqual(models);
    expect(JSON.parse(localStorage.getItem('openai_selected_models')!)).toEqual(selected);
    expect(fetchModels).not.toHaveBeenCalled();
  });

  it.each(['not-json', 'null', JSON.stringify({ id: 'gpt-unknown' }), JSON.stringify([null, 123, '', ' padded ', 'bad\nmodel'])])(
    'recovers an unusable cache (%s) and validates fresh model IDs before rendering or persistence', async cache => {
      localStorage.setItem('openai_models', cache);
      const models = ['gpt-fresh', 'Model', 'model', 'café', 'cafe\u0301', 'org/👩\u200d💻'];
      const fresh = [123, null, ...models, ' padded ', 'bad\nmodel', 'x'.repeat(513), ...models];
      vi.mocked(fetchModels).mockResolvedValueOnce(fresh as string[]);
      const dispatch = vi.fn();
      view = mount(<ProviderList apiKeys={{}} dispatch={dispatch} selectedPairs={[]} />);
      await act(async () => {
        view.rerender(<ProviderList apiKeys={{ openai: 'synthetic-key' }} dispatch={dispatch} selectedPairs={[]} />);
        await Promise.resolve();
      });
      expect(fetchModels).toHaveBeenCalledExactlyOnceWith('openai', 'synthetic-key');
      expect(listed()).toEqual(models);
      expect(JSON.parse(localStorage.getItem('openai_models')!)).toEqual(models);
    },
  );

  it('shows retry rather than blank choices when every freshly fetched ID is invalid', async () => {
    localStorage.removeItem('openai_models');
    vi.mocked(fetchModels).mockResolvedValueOnce(['', ' padded ', 'bad\u0000model', 'x'.repeat(513)]);
    view = mount(<ProviderList apiKeys={{ openai: 'synthetic-key' }} dispatch={vi.fn()} selectedPairs={[]} />);
    await act(async () => { await Promise.resolve(); });
    expect(search()).toBeNull();
    expect(view.container.querySelector('button[aria-label="Retry model list for OpenAI"]')).not.toBeNull();
    expect(localStorage.getItem('openai_models')).toBeNull();
  });

  it.each(['not-json', JSON.stringify({ id: 'gpt-unknown' }), JSON.stringify([123, null, ' padded ', 'bad\nmodel'])])(
    'retains a valid legacy fallback after unusable saved selections (%s)', multi => {
      const legacy = 'org/می\u200cروم';
      localStorage.setItem('openai_selected_models', multi);
      localStorage.setItem('openai_model', legacy);
      const dispatch = vi.fn();
      view = mount(<ProviderList apiKeys={{}} dispatch={dispatch} selectedPairs={[]} />);
      expect(restored(dispatch)).toEqual([legacy]);
      expect(JSON.parse(localStorage.getItem('openai_selected_models')!)).toEqual([legacy]);
      expect(localStorage.getItem('openai_model')).toBe(legacy);
    },
  );

  it.each([' padded ', 'bad\u0085model', 'x'.repeat(513)])('drops an invalid legacy selection (%j)', legacy => {
    localStorage.setItem('openai_model', legacy);
    const dispatch = vi.fn();
    view = mount(<ProviderList apiKeys={{}} dispatch={dispatch} selectedPairs={[]} />);
    expect(restored(dispatch)).toEqual([]);
    expect(JSON.parse(localStorage.getItem('openai_selected_models')!)).toEqual([]);
    expect(localStorage.getItem('openai_model')).toBeNull();
  });

  it('prefers valid multi-selections over the legacy value and leaves new-user selection defaults empty', () => {
    const dispatch = vi.fn();
    view = mount(<ProviderList apiKeys={{}} dispatch={dispatch} selectedPairs={[]} />);
    expect(restored(dispatch)).toEqual([]);
    expect(localStorage.getItem('openai_selected_models')).toBeNull();
    view.unmount();
    dispatch.mockClear();
    localStorage.setItem('openai_selected_models', JSON.stringify(['gpt-beta', 'gpt-beta']));
    localStorage.setItem('openai_model', 'gpt-alpha');
    view = mount(<ProviderList apiKeys={{}} dispatch={dispatch} selectedPairs={[]} />);
    expect(restored(dispatch)).toEqual(['gpt-beta']);
  });

  it('uses validated cached state and selections even when cleanup cannot be saved', () => {
    localStorage.setItem('openai_models', JSON.stringify(['gpt-alpha', ' padded ', 'gpt-alpha']));
    localStorage.setItem('openai_selected_models', JSON.stringify(['bad\nmodel', 'gpt-alpha', 'gpt-alpha']));
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('Full storage', 'QuotaExceededError');
    });
    const dispatch = vi.fn();
    try {
      view = mount(<ProviderList apiKeys={{}} dispatch={dispatch} selectedPairs={[]} />);
      expect(restored(dispatch)).toEqual(['gpt-alpha']);
      view.rerender(<ProviderList apiKeys={{ openai: 'synthetic-key' }} dispatch={dispatch} selectedPairs={[]} />);
      expect(listed()).toEqual(['gpt-alpha']);
    } finally { write.mockRestore(); }
  });

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

  it('clears model search query when clicking the clear button or pressing Escape', () => {
    view = mount(<ProviderList apiKeys={{ openai: 'synthetic-key' }} dispatch={vi.fn()} selectedPairs={[]} />);
    const searchInput = search();

    expect(view.container.querySelector('button[aria-label="Clear model search for OpenAI"]')).toBeNull();

    inputValue(searchInput, 'alpha');
    expect(searchInput.value).toBe('alpha');

    const clearButton = view.container.querySelector<HTMLButtonElement>('button[aria-label="Clear model search for OpenAI"]');
    expect(clearButton).not.toBeNull();
    expect(clearButton!.title).toBe('Clear search (Esc)');

    click(clearButton!);
    expect(searchInput.value).toBe('');
    expect(view.container.querySelector('button[aria-label="Clear model search for OpenAI"]')).toBeNull();

    inputValue(searchInput, 'beta');
    expect(searchInput.value).toBe('beta');

    key(searchInput, 'Escape');
    expect(searchInput.value).toBe('');
  });
});

describe('escaped model picker presentation', () => {
  it('keeps confusing identifiers independently selectable and stores exact originals', () => {
    const models = ['gpt-4o', 'gpt\u200b-4o', 'gpt\\u{200B}-4o', 'gpt\u202e-4o'];
    localStorage.setItem('openai_models', JSON.stringify(models));
    const dispatch = vi.fn();
    view = mount(<ProviderList apiKeys={{ openai: 'synthetic-key' }} dispatch={dispatch} selectedPairs={[]} />);
    const card = search().closest('li')!;
    const checks = [...card.querySelectorAll<HTMLInputElement>('label input[type="checkbox"]')].slice(0, 4);
    expect(checks.map(check => check.getAttribute('aria-label'))).toEqual(['gpt-4o', '\u2068gpt\u200b-4o\u2069 · Escaped representation: gpt\\u{200B}-4o', '\u2068gpt\\u{200B}-4o\u2069 · Escaped representation: gpt\\\\u{200B}-4o', 'Escaped representation: gpt\\u{202E}-4o']);
    const selected: { providerId: string; modelId: string }[] = [];
    checks.forEach((check, index) => {
      click(check);
      expect(dispatch.mock.calls.at(-1)?.[0]).toEqual({ type: 'TOGGLE_MODEL_SELECTION', payload: { providerId: 'openai', modelId: models[index] } });
      selected.push({ providerId: 'openai', modelId: models[index] });
      view.rerender(<ProviderList apiKeys={{ openai: 'synthetic-key' }} dispatch={dispatch} selectedPairs={[...selected]} />);
    });
    expect(checks.every(check => check.checked)).toBe(true);
    expect(JSON.parse(localStorage.getItem('openai_selected_models')!)).toEqual(models);
    expect(JSON.parse(localStorage.getItem('openai_models')!)).toEqual(models);
    expect(card.querySelector('label button, label details')).toBeNull();
    expect(card.textContent).not.toContain('\u202e');
  });
  it('searches both raw and escaped displayed text without decoding typed escapes', () => {
    localStorage.setItem('openai_models', JSON.stringify(['gpt\u200b-4o', 'gpt\\u{200B}-4o']));
    view = mount(<ProviderList apiKeys={{ openai: 'synthetic-key' }} dispatch={vi.fn()} selectedPairs={[]} />);
    inputValue(search(), 'gpt\\u{200b}-4o');
    expect(search().closest('li')?.textContent).toContain('Escaped representation: gpt\\u{200B}-4o');
    inputValue(search(), '\u200b');
    expect(search().closest('li')?.querySelectorAll('label span[title]')).toHaveLength(1);
    inputValue(search(), '\\u200b');
    expect(search().closest('li')?.textContent).toContain('No models match');
  });
});

describe('provider key icon', () => {
  it.each([false, true])('keeps the %s configured-key action named and opens the correct provider dialog', async hasKey => {
    const dispatch = vi.fn();
    await act(async () => { view = mount(<ProviderList apiKeys={hasKey ? { openai: 'synthetic-key' } : {}} dispatch={dispatch} selectedPairs={[]} />); });
    const label = `${hasKey ? 'Edit' : 'Add'} API key for OpenAI`;
    const button = view.container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
    expect(button.title).toBe(label);
    const icon = button.querySelector('svg');
    expect(icon).not.toBeNull();
    expect(icon!.getAttribute('aria-hidden')).toBe('true');
    expect(icon!.getAttribute('focusable')).toBe('false');
    expect(icon!.getAttribute('stroke')).toBe('currentColor');
    click(button);
    const dialog = view.container.querySelector('[role="dialog"]')!;
    expect(dialog.querySelector('h2')?.textContent).toBe('Enter API Key for OpenAI');
    inputValue(dialog.querySelector<HTMLInputElement>('input')!, 'synthetic-replacement-key');
    await act(async () => { click([...dialog.querySelectorAll<HTMLButtonElement>('button')].find(control => control.textContent === 'Save Key')!); });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_API_KEY', payload: { providerId: 'openai', apiKey: 'synthetic-replacement-key' } });
    expect(view.container.querySelector('[role="dialog"]')).toBeNull();
  });
});
