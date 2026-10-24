// @vitest-environment happy-dom
import React, { act } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Home from '../pages/index';
import { click, mount } from './reactDom';

const { router } = vi.hoisted(() => ({ router: { pathname: '/', query: { model: '', provider: 'openai' }, replace: vi.fn() } }));
vi.mock('next/router', () => ({ useRouter: () => router }));
vi.mock('next/head', () => ({ default: () => null }));
let view: ReturnType<typeof mount>;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('No network in suggestion test'); }));
  localStorage.clear(); sessionStorage.clear(); router.replace.mockClear();
});
afterEach(() => { view?.unmount(); vi.unstubAllGlobals(); localStorage.clear(); sessionStorage.clear(); });

it('renders the actual query-model handoff safely while preserving router, search and selection semantics', async () => {
  const raw = 'gpt\u202e-4o';
  router.query.model = ` ${raw} `;
  localStorage.setItem('openai_models', JSON.stringify([raw]));
  sessionStorage.setItem('openai_api_key', 'synthetic-test-key');
  await act(async () => { view = mount(<Home />); });
  const banner = view.container.querySelector('.race-model-handoff')!;
  expect(banner.textContent).not.toContain('\u202e');
  expect(banner.textContent).toContain('Escaped representation: gpt\\u{202E}-4o');
  expect(router.query.model).toBe(` ${raw} `);
  const search = view.container.querySelector<HTMLInputElement>('input[aria-label="Search models for OpenAI"]')!;
  expect(search.value).toBe(raw);
  const checkbox = search.closest('li')!.querySelector<HTMLInputElement>('label input[type="checkbox"]')!;
  click(checkbox);
  expect(JSON.parse(localStorage.getItem('openai_selected_models')!)).toEqual([raw]);
  expect(fetch).not.toHaveBeenCalled();
  click(banner.querySelector('button')!);
  expect(router.replace).toHaveBeenCalledExactlyOnceWith('/', undefined, { shallow: true });
});
