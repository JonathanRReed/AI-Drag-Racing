import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ApiKeyModal from './ApiKeyModal';

describe('ApiKeyModal', () => {
  it('renders nothing when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <ApiKeyModal
        isOpen={false}
        onClose={() => {}}
        providerName="OpenAI"
        onSave={() => {}}
      />
    );
    expect(html).toBe('');
  });

  it('renders the password input and visibility toggle button when isOpen is true', () => {
    const html = renderToStaticMarkup(
      <ApiKeyModal
        isOpen={true}
        onClose={() => {}}
        providerName="OpenAI"
        onSave={() => {}}
      />
    );

    expect(html).toContain('Enter API Key for OpenAI');
    expect(html).toContain('type="password"');
    expect(html).toContain('aria-label="Show API key"');
  });
});
