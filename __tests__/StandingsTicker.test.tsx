// @vitest-environment happy-dom
import React from 'react';
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { mount } from './reactDom';
import StandingsTicker from '../components/main/StandingsTicker';
import { LaneBuffer } from '../utils/raceBuffers';
import { PaceLane } from '../components/main/LivePaceChart';

let view: ReturnType<typeof mount> | undefined;

const lanes: PaceLane[] = [
  { id: 'openai-gpt-4o', label: 'OpenAI', sublabel: 'gpt-4o', color: '#00a67e' },
  { id: 'groq-llama-3', label: 'Groq', sublabel: 'llama-3.3-70b', color: '#f55036' },
];

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.useFakeTimers();
});

afterEach(() => {
  view?.unmount();
  view = undefined;
  document.body.innerHTML = '';
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('StandingsTicker', () => {
  test('renders lanes in order of cumulative character count', () => {
    const buffers: Record<string, LaneBuffer> = {
      'openai-gpt-4o': { id: 'openai-gpt-4o', samples: [], chars: 500, lastT: 1000, done: false, errored: false, finalOutputTokens: null, firstTokenT: 100 },
      'groq-llama-3': { id: 'groq-llama-3', samples: [], chars: 1200, lastT: 800, done: false, errored: false, finalOutputTokens: null, firstTokenT: 80 },
    };
    const buffersRef = { current: buffers };

    view = mount(
      <StandingsTicker
        lanes={lanes}
        buffersRef={buffersRef}
        running={true}
        mode="drag"
        reducedMotion={true}
      />
    );

    const items = [...view.container.querySelectorAll('li')];
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Groq');
    expect(items[1].textContent).toContain('OpenAI');
  });

  test('ranks errored lanes as DNF at the bottom', () => {
    const buffers: Record<string, LaneBuffer> = {
      'openai-gpt-4o': { id: 'openai-gpt-4o', samples: [], chars: 500, lastT: 1000, done: true, errored: true, finalOutputTokens: null, firstTokenT: 100 },
      'groq-llama-3': { id: 'groq-llama-3', samples: [], chars: 200, lastT: 800, done: false, errored: false, finalOutputTokens: null, firstTokenT: 80 },
    };
    const buffersRef = { current: buffers };

    view = mount(
      <StandingsTicker
        lanes={lanes}
        buffersRef={buffersRef}
        running={false}
        mode="drag"
        reducedMotion={true}
      />
    );

    const items = [...view.container.querySelectorAll('li')];
    expect(items[0].textContent).toContain('Groq');
    expect(items[1].textContent).toContain('OpenAI');
    expect(items[1].textContent).toContain('DNF');
  });

  test('skips re-rendering when props remain shallowly equal due to React.memo', () => {
    const buffers: Record<string, LaneBuffer> = {
      'openai-gpt-4o': { id: 'openai-gpt-4o', samples: [], chars: 500, lastT: 1000, done: false, errored: false, finalOutputTokens: null, firstTokenT: 100 },
      'groq-llama-3': { id: 'groq-llama-3', samples: [], chars: 1200, lastT: 800, done: false, errored: false, finalOutputTokens: null, firstTokenT: 80 },
    };
    const buffersRef = { current: buffers };

    view = mount(
      <StandingsTicker
        lanes={lanes}
        buffersRef={buffersRef}
        running={false}
        mode="drag"
        reducedMotion={true}
      />
    );

    view.rerender(
      <StandingsTicker
        lanes={lanes}
        buffersRef={buffersRef}
        running={false}
        mode="drag"
        reducedMotion={true}
      />
    );

    const items = [...view.container.querySelectorAll('li')];
    expect(items[0].textContent).toContain('Groq');
  });
});
