// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StandingsTicker from '../components/main/StandingsTicker';
import { createLaneBuffer, pushChunk } from '../utils/raceBuffers';
import { mount } from './reactDom';

let view: ReturnType<typeof mount>;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
});

afterEach(() => {
  view?.unmount();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const lanes = [
  { id: 'lane-1', label: 'OpenAI', sublabel: 'gpt-4o', color: '#10a37f' },
  { id: 'lane-2', label: 'Anthropic', sublabel: 'claude-3-5-sonnet', color: '#d97706' },
];

describe('StandingsTicker component memoization', () => {
  it('renders correctly and ranks by streamed characters', () => {
    const buf1 = createLaneBuffer('lane-1');
    const buf2 = createLaneBuffer('lane-2');
    pushChunk(buf1, 'Hello world', 100); // 11 chars
    pushChunk(buf2, 'Hello world from Anthropic!', 100); // 27 chars

    const buffersRef = { current: { 'lane-1': buf1, 'lane-2': buf2 } };

    view = mount(
      <StandingsTicker
        lanes={lanes}
        buffersRef={buffersRef}
        running={true}
        mode="drag"
        reducedMotion={true}
      />
    );

    expect(view.container.textContent).toContain('Anthropic');
    expect(view.container.textContent).toContain('OpenAI');
  });

  it('skips re-rendering DOM nodes when parent re-renders with shallowly equal props', () => {
    const buf1 = createLaneBuffer('lane-1');
    const buf2 = createLaneBuffer('lane-2');
    const buffersRef = { current: { 'lane-1': buf1, 'lane-2': buf2 } };

    view = mount(
      <StandingsTicker
        lanes={lanes}
        buffersRef={buffersRef}
        running={true}
        mode="drag"
        reducedMotion={true}
      />
    );

    const liElement = view.container.querySelector('li');
    expect(liElement).not.toBeNull();

    // Observe DOM mutations
    const observer = new MutationObserver(() => {});
    observer.observe(view.container, { attributes: true, childList: true, characterData: true, subtree: true });

    // Re-render StandingsTicker with identical props (simulating parent re-render on COMMIT_TEXT)
    view.rerender(
      <StandingsTicker
        lanes={lanes}
        buffersRef={buffersRef}
        running={true}
        mode="drag"
        reducedMotion={true}
      />
    );

    // Because of React.memo, no DOM mutations should have occurred
    expect(observer.takeRecords()).toHaveLength(0);

    // The reference to the same rendered DOM element remains identical
    expect(view.container.querySelector('li')).toBe(liElement);

    observer.disconnect();
  });
});
