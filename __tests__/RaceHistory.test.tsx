// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RaceHistory from '../components/main/RaceHistory';
import type { RaceReceipt } from '../utils/raceReceipts';
import { click, mount } from './reactDom';

let view: ReturnType<typeof mount>;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  if (typeof URL.createObjectURL === 'undefined') {
    URL.createObjectURL = vi.fn(() => 'blob:test');
  } else {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
  }
  if (typeof URL.revokeObjectURL === 'undefined') {
    URL.revokeObjectURL = vi.fn();
  } else {
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  }
});

afterEach(() => {
  view?.unmount();
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const mockReceipt: RaceReceipt = {
  id: 'race-12345678',
  schemaVersion: 1,
  createdAt: '2026-08-01T12:00:00.000Z',
  experience: 'quick',
  mode: 'drag',
  prompt: {
    characters: 20,
    unit: 'characters',
    fingerprint: 'abc12345',
  },
  settings: {
    temperature: 0.7,
    maxTokens: 512,
    topP: 1,
  },
  lanes: [
    {
      providerId: 'openai',
      modelId: 'gpt-4o',
      metrics: {
        startTime: 1000,
        firstTokenTime: 1200,
        finishTime: 2000,
        tokenCount: 50,
      },
      browser: {
        ttftMs: 200,
        totalMs: 1000,
      },
      error: null,
      status: 'completed',
    },
  ],
};

describe('RaceHistory component', () => {
  it('renders action buttons with descriptive ARIA labels', () => {
    const onDelete = vi.fn();
    const onClear = vi.fn();
    view = mount(<RaceHistory receipts={[mockReceipt]} onDelete={onDelete} onClear={onClear} />);

    const exportBtn = view.container.querySelector('button[aria-label^="Export JSON receipt for race on"]');
    expect(exportBtn).not.toBeNull();

    const deleteBtn = view.container.querySelector('button[aria-label^="Delete local record for race on"]');
    expect(deleteBtn).not.toBeNull();
  });

  it('shows visual confirmation feedback ("Exported ✓") when exporting JSON', () => {
    const onDelete = vi.fn();
    const onClear = vi.fn();
    view = mount(<RaceHistory receipts={[mockReceipt]} onDelete={onDelete} onClear={onClear} />);

    const exportBtn = view.container.querySelector<HTMLButtonElement>('button[aria-label^="Export JSON receipt for race on"]')!;
    expect(exportBtn.textContent).toBe('Export JSON');

    click(exportBtn);

    expect(exportBtn.textContent).toBe('Exported ✓');
  });
});
