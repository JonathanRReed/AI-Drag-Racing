// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PaceLegend from '../components/main/PaceLegend';
import { mount } from './reactDom';
let view: ReturnType<typeof mount>;
beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true));
afterEach(() => { view?.unmount(); vi.unstubAllGlobals(); });
it('keeps ordinary pace legends compact and exposes technical identifiers without hover', () => {
  const lanes = [{ id: 'one', label: 'OpenAI', sublabel: 'gpt-4o', color: '#fff' }, { id: 'two', label: 'OpenAI', sublabel: 'gpt\u202e-4o', color: '#fff' }];
  view = mount(<PaceLegend lanes={lanes} />);
  expect(view.container.querySelector('[title="OpenAI · gpt-4o"]')?.textContent).toBe('OpenAI');
  expect(view.container.textContent).toContain('Escaped representation: gpt\\u{202E}-4o');
  expect(view.container.textContent).not.toContain('\u202e');
  for (const node of view.container.querySelectorAll('[title]')) expect(node.getAttribute('title')).not.toContain('\u202e');
});
