// @vitest-environment happy-dom
import React, { act } from 'react';
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { mount, click } from './reactDom';
import RaceLane from '../components/main/RaceLane';

let view: ReturnType<typeof mount>;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
});

afterEach(() => {
  view?.unmount();
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('RaceLane', () => {
  test('does not show copy button when responseText is empty', () => {
    view = mount(
      <RaceLane
        providerName="openai"
        modelName="gpt-4o"
        responseText=""
        metrics={null}
        isLoading={false}
        error={null}
      />
    );

    const copyBtn = view.container.querySelector('button[aria-label*="Copy"]');
    expect(copyBtn).toBeNull();
  });

  test('copies response text to clipboard and updates button state on click', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
      writable: true,
    });

    view = mount(
      <RaceLane
        providerName="openai"
        modelName="gpt-4o"
        responseText="Hello world response"
        metrics={{ startTime: 1000, firstTokenTime: 1200, finishTime: 2000, outputTokens: 10 }}
        isLoading={false}
        error={null}
      />
    );

    const copyBtn = view.container.querySelector<HTMLButtonElement>('button[aria-label="Copy OpenAI response"]');
    expect(copyBtn).not.toBeNull();

    await act(async () => {
      click(copyBtn!);
    });

    expect(writeTextMock).toHaveBeenCalledWith('Hello world response');

    const copiedBtn = view.container.querySelector<HTMLButtonElement>('button[aria-label="Copied OpenAI response"]');
    expect(copiedBtn).not.toBeNull();
    expect(copiedBtn?.getAttribute('title')).toBe('Copied ✓');
  });
});
