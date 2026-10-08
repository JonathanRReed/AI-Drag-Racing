import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ApiKeyModal from '../components/sidebar/ApiKeyModal';

describe('ApiKeyModal', () => {
  it('renders modal with aria-describedby, close button, and visibility toggle', () => {
    const html = renderToStaticMarkup(
      <ApiKeyModal
        isOpen={true}
        onClose={() => {}}
        providerName="OpenAI"
        onSave={() => {}}
      />
    );

    expect(html).toContain('aria-describedby="api-key-modal-description"');
    expect(html).toContain('id="api-key-modal-description"');
    expect(html).toContain('aria-label="Close dialog"');
    expect(html).toContain('aria-label="Show API key"');
    expect(html).toContain('type="password"');
  });
});
