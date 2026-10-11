// @vitest-environment happy-dom
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PromptInput from '../components/main/PromptInput';
import { measurePromptCharacters } from '../utils/promptCharacters';
import { click, mount } from './reactDom';

let view: ReturnType<typeof mount> | undefined;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); });
afterEach(() => {
  view?.unmount();
  view = undefined;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('prompt character counter', () => {
  it.each(['🤖', 'e\u0301', '👨‍👩‍👧‍👦', '🇺🇸'])('counts %s as one visible character', (prompt) => {
    expect(measurePromptCharacters(prompt)).toEqual({ count: 1, label: '1 character', shortUnit: 'char' });
  });

  it('labels the fallback as code points when segmentation is unavailable', () => {
    vi.stubGlobal('Intl', { Segmenter: undefined });
    expect(measurePromptCharacters('🇺🇸')).toEqual({ count: 2, label: '2 code points', shortUnit: 'code point' });
  });

  it('defers browser-dependent counter markup until hydration', () => {
    const html = renderToStaticMarkup(
      <PromptInput prompt="A normal prompt" onPromptChange={() => {}} onSubmit={() => {}} isLoading={false} />
    );
    expect(html).not.toMatch(/aria-label="\d+ characters?"/);
  });

  it('renders start button with contextual tooltip when disabled or loading', () => {
    const htmlNoPrompt = renderToStaticMarkup(
      <PromptInput prompt="" onPromptChange={() => {}} onSubmit={() => {}} isLoading={false} />
    );
    expect(htmlNoPrompt).toContain('title="Enter a prompt to start"');
    expect(htmlNoPrompt).toContain('disabled=""');

    const htmlDisabled = renderToStaticMarkup(
      <PromptInput prompt="Hello" onPromptChange={() => {}} onSubmit={() => {}} isLoading={false} disabled={true} />
    );
    expect(htmlDisabled).toContain('title="Select a model and add its API key"');
    expect(htmlDisabled).toContain('disabled=""');

    const htmlLoading = renderToStaticMarkup(
      <PromptInput prompt="Hello" onPromptChange={() => {}} onSubmit={() => {}} isLoading={true} />
    );
    expect(htmlLoading).toContain('title="Race in progress"');
    expect(htmlLoading).toContain('disabled=""');

    const htmlBothDisabledAndLoading = renderToStaticMarkup(
      <PromptInput prompt="Hello" onPromptChange={() => {}} onSubmit={() => {}} isLoading={true} disabled={true} />
    );
    expect(htmlBothDisabledAndLoading).toContain('title="Race in progress"');

    const htmlReady = renderToStaticMarkup(
      <PromptInput prompt="Hello" onPromptChange={() => {}} onSubmit={() => {}} isLoading={false} disabled={false} />
    );
    expect(htmlReady).toContain('title="Start race with prompt"');
    expect(htmlReady).not.toContain('disabled=""');
  });

  it('submits once when ready and never when disabled', () => {
    const onSubmit = vi.fn();
    view = mount(<PromptInput prompt="Hello" onPromptChange={() => {}} onSubmit={onSubmit} isLoading={false} disabled={true} />);

    const startBtn = view.container.querySelector('button[aria-label="Start Race"]') as HTMLButtonElement;
    expect(startBtn.disabled).toBe(true);
    click(startBtn);
    expect(onSubmit).not.toHaveBeenCalled();

    view.rerender(<PromptInput prompt="Hello" onPromptChange={() => {}} onSubmit={onSubmit} isLoading={false} disabled={false} />);
    expect(startBtn.disabled).toBe(false);
    click(startBtn);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
