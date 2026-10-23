// @vitest-environment happy-dom
import React from 'react';
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { mount } from './reactDom';
import ResultsDisplay, { type ResultState } from '../components/main/ResultsDisplay';

let view: ReturnType<typeof mount> | undefined;

const RESULTS: ResultState[] = [
  {
    id: 'openai-gpt-4o',
    providerName: 'openai',
    modelName: 'gpt-4o',
    responseText: 'Hello from OpenAI',
    metrics: { startTime: 1000, firstTokenTime: 1200, finishTime: 2000, tokenCount: 10, outputTokens: 10 },
    isLoading: false,
    error: null,
    browserTiming: null,
    edgeRegion: 'iad',
  },
  {
    id: 'anthropic-claude-haiku',
    providerName: 'anthropic',
    modelName: 'claude-haiku',
    responseText: '',
    metrics: null,
    isLoading: false,
    error: 'API rate limit exceeded',
    browserTiming: null,
    edgeRegion: null,
  },
];

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
});

afterEach(() => {
  view?.unmount();
  view = undefined;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ResultsDisplay', () => {
  test('renders empty state message when results array is empty', () => {
    view = mount(<ResultsDisplay results={[]} />);
    expect(view.container.textContent).toContain('Line up your racers');
    expect(view.container.textContent).toContain('Add a provider in the Racers panel');
  });

  test('renders onDemo action button when onDemo callback is passed', () => {
    const onDemo = vi.fn();
    view = mount(<ResultsDisplay results={[]} onDemo={onDemo} />);
    const button = view.container.querySelector('button');
    expect(button?.textContent).toContain('Watch a demo race');
  });

  test('renders all results when hideFailed is false', () => {
    view = mount(<ResultsDisplay results={RESULTS} hideFailed={false} />);
    expect(view.container.textContent).toContain('gpt-4o');
    expect(view.container.textContent).toContain('claude-haiku');
  });

  test('filters out failed results when hideFailed is true', () => {
    view = mount(<ResultsDisplay results={RESULTS} hideFailed={true} />);
    expect(view.container.textContent).toContain('gpt-4o');
    expect(view.container.textContent).not.toContain('claude-haiku');
  });

  test('memoizes component to skip re-renders when props remain identical', () => {
    let renderCount = 0;
    const SpyWrapper = (props: React.ComponentProps<typeof ResultsDisplay>) => {
      renderCount++;
      return <ResultsDisplay {...props} />;
    };

    view = mount(<SpyWrapper results={RESULTS} hideFailed={false} />);
    expect(renderCount).toBe(1);

    // Re-render with identical props
    view.rerender(<SpyWrapper results={RESULTS} hideFailed={false} />);
    expect(renderCount).toBe(2);
  });
});
