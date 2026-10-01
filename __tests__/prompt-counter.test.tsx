import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PromptInput from '../components/main/PromptInput';
import { measurePromptCharacters } from '../utils/promptCharacters';

afterEach(() => vi.unstubAllGlobals());

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
});
