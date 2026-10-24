// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ModelIdentifier from '../components/ModelIdentifier';
import { click, mount } from './reactDom';
let view: ReturnType<typeof mount>;
beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true));
afterEach(() => { view?.unmount(); vi.unstubAllGlobals(); });

describe('ModelIdentifier', () => {
  it('isolates ordinary text and adds no technical UI for ordinary identifiers', () => {
    view = mount(<ModelIdentifier value="vendor/模型" />);
    expect(view.container.textContent).toBe('vendor/模型');
    expect(view.container.querySelector('bdi')?.getAttribute('dir')).toBe('auto');
    expect(view.container.querySelector('[title]')?.getAttribute('title')).toBe('vendor/模型');
  });
  it('shows joiner detail visibly without nested interactive controls', () => {
    view = mount(<label><input type="checkbox" /><ModelIdentifier value={'org/👩\u200d💻'} /></label>);
    expect(view.container.querySelector('bdi')?.textContent).toBe('org/👩\u200d💻');
    expect(view.container.textContent).toContain('Escaped representation: org/\\u{1F469}\\u{200D}\\u{1F4BB}');
    expect(view.container.textContent).toContain('Requests keep the original ID.');
    expect(view.container.querySelector('label button, label details')).toBeNull();
    expect(view.container.querySelector('[title]')?.getAttribute('title')).toBe('\u2068org/👩\u200d💻\u2069 · Escaped representation: org/\\u{1F469}\\u{200D}\\u{1F4BB}');
  });
  it('uses escaped text as authoritative for bidi overrides in visible and accessible text', () => {
    view = mount(<ModelIdentifier value={'gpt\u202e-4o'} />);
    expect(view.container.textContent).not.toContain('\u202e');
    expect(view.container.textContent).toContain('Escaped representation: gpt\\u{202E}-4o');
    for (const element of view.container.querySelectorAll('[title], [aria-label]')) {
      expect(element.getAttribute('title') ?? element.getAttribute('aria-label')).not.toContain('\u202e');
    }
  });
  it('provides bounded keyboard-accessible pages for long historical IDs and resets on replacement', () => {
    view = mount(<ModelIdentifier value={'a'.repeat(512) + '\u202eEND'} />);
    expect(view.container.textContent).toContain('UTF-16 units 1–512 of 516');
    const next = view.container.querySelector<HTMLButtonElement>('button[aria-label="Next identifier page"]')!;
    expect(next.tabIndex).toBe(0);
    click(next);
    expect(view.container.textContent).toContain('\\u{202E}END');
    expect(view.container.textContent).toContain('UTF-16 units 513–516 of 516');
    expect(view.container.querySelector('[title]')?.getAttribute('title')).toContain('\\u{202E}END');
    click(view.container.querySelector<HTMLButtonElement>('button[aria-label="Previous identifier page"]')!);
    expect(view.container.textContent).toContain('UTF-16 units 1–512 of 516');
    view.rerender(<ModelIdentifier value="ordinary" />);
    expect(view.container.textContent).toBe('ordinary');
  });
});
