import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const providerListSource = readFileSync('components/sidebar/ProviderList.tsx', 'utf8');
const privacySource = readFileSync('pages/privacy.tsx', 'utf8');
const homeSource = readFileSync('pages/index.tsx', 'utf8');
const stylesSource = readFileSync('styles/globals.css', 'utf8');

describe('privacy and mobile UI contracts', () => {
  it('keeps provider API keys tab-scoped and removes legacy persistent keys', () => {
    expect(providerListSource).toContain('sessionStorage.setItem(`${modalOpenFor.id}_api_key`, apiKey)');
    expect(providerListSource).toContain('sessionStorage.getItem(`${p.id}_api_key`)');
    expect(providerListSource).toContain('localStorage.removeItem(`${p.id}_api_key`)');
    expect(providerListSource).not.toContain('localStorage.setItem(`${modalOpenFor.id}_api_key`, apiKey)');
    expect(privacySource).toContain('Closing the tab clears them');
  });

  it('offers a no-key demo and keeps live race controls available on mobile', () => {
    expect(homeSource).toContain('Run a demo race');
    expect(homeSource).toContain('Demo timings are simulated and never saved.');
    // Tailwind v4 expresses component classes as @utility blocks.
    expect(stylesSource).toMatch(/(\.|@utility )race-start-button\b/);
    expect(stylesSource).toContain('col-span-2 inline-flex min-h-11');
    expect(stylesSource).toMatch(/(\.finish-board-table tbody td::before|@utility finish-board-table)/);
  });
});
