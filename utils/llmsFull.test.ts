import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildLlmsFullText } from '../lib/llmsFull';
import { DEFINITIONS, HOW_TO_COMPARE, SECTIONS, plainText } from '../lib/methodologyContent';

describe('llms-full.txt', () => {
  it('matches the methodology content (regenerate with: bun scripts/generate-llms-full.ts)', () => {
    expect(readFileSync('public/llms-full.txt', 'utf8')).toBe(buildLlmsFullText());
  });

  it('keeps the privacy boundary and the n = 1 caveat in the shared content', () => {
    const text = buildLlmsFullText();
    expect(text).toContain('They do not include the prompt text, response text, API keys, IP address, or precise location.');
    expect(text).toContain('One run per model per race. n = 1.');
    expect(text).not.toMatch(/fastest model|best model/i);
    expect(DEFINITIONS.length).toBeGreaterThanOrEqual(6);
    expect(HOW_TO_COMPARE.length).toBeGreaterThanOrEqual(5);
    expect(SECTIONS.map((section) => section.id)).toContain('not-recorded');
  });

  it('strips inline markup for plain text', () => {
    expect(plainText('**Bold** and `code` and [AI Stats](https://aistats.jonathanrreed.com)')).toBe(
      'Bold and code and AI Stats (https://aistats.jonathanrreed.com)',
    );
  });
});
