import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PromptInput from '../components/main/PromptInput';

describe('prompt character counter', () => {
  it.each(['🤖', 'e\u0301', '👨‍👩‍👧‍👦', '🇺🇸'])('counts %s as one visible character', (prompt) => {
    const html = renderToStaticMarkup(
      <PromptInput prompt={prompt} onPromptChange={() => {}} onSubmit={() => {}} isLoading={false} />
    );
    expect(html).toContain('aria-label="1 character"');
    expect(html).toContain('1 char<');
  });
});


it('defers browser-dependent counter markup until hydration', () => {
  const html = renderToStaticMarkup(
    <PromptInput prompt="A normal prompt" onPromptChange={() => {}} onSubmit={() => {}} isLoading={false} />
  );
  expect(html).not.toMatch(/aria-label="\d+ characters?"/);
});
