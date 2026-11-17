// @vitest-environment happy-dom
import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RaceHistory from '../components/main/RaceHistory';
import { createRaceReceipt, type RaceReceipt } from '../utils/raceReceipts';
import { createRaceShare, isRaceShareConfigured } from '../utils/raceShares';
import { click, mount } from './reactDom';

vi.mock('../utils/raceShares', () => ({
  createRaceShare: vi.fn(),
  isRaceShareConfigured: vi.fn(),
}));

let view: ReturnType<typeof mount> | undefined;
let mockReceipt: RaceReceipt;
const share = { shareId: 'share-123', expiresAt: '2026-08-31T12:00:00.000Z' };

beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-01T12:00:00.000Z'));
  vi.mocked(isRaceShareConfigured).mockReturnValue(true);
  vi.mocked(createRaceShare).mockResolvedValue(share);
  vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = vi.fn(() => 'blob:test');
    static revokeObjectURL = vi.fn();
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  mockReceipt = await createRaceReceipt({
    id: 'race-12345678',
    now: Date.parse('2026-08-01T12:00:00.000Z'),
    experience: 'quick',
    mode: 'drag',
    prompt: 'A test race prompt',
    settings: { temperature: 0.7, maxTokens: 512, topP: 1, repetitions: 1, concurrency: 1 },
    lanes: [{
      providerId: 'openai', modelId: 'gpt-4o', metrics: null,
      browser: { ttftMs: 200, totalMs: 1000 }, error: null,
    }],
  });
});

afterEach(() => {
  view?.unmount();
  view = undefined;
  document.body.innerHTML = '';
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

function setup(receipts = [mockReceipt]) {
  const onDelete = vi.fn();
  const onClear = vi.fn();
  view = mount(<RaceHistory receipts={receipts} onDelete={onDelete} onClear={onClear} />);
  return { onDelete, onClear };
}

function exportButton(row = 0) {
  return view!.container.querySelectorAll<HTMLButtonElement>('.race-history-actions button')[row * 3];
}

function shareButton() {
  return view!.container.querySelectorAll<HTMLButtonElement>('.race-history-actions button')[1];
}

function expectActionName(button: HTMLButtonElement, action: string) {
  const date = view!.container.querySelector('time')!.textContent;
  expect(button.textContent).toBe(action);
  expect(button.getAttribute('aria-label')).toContain(`${action} `);
  expect(button.getAttribute('aria-label')).toContain(`for race on ${date}`);
}

describe('RaceHistory component', () => {
  it('labels actions with their current text and race date', () => {
    const { onDelete } = setup();
    expectActionName(exportButton(), 'Export JSON');
    expectActionName(shareButton(), 'Share for 30 days');
    const deleteButton = view!.container.querySelector<HTMLButtonElement>('button[aria-label^="Delete local record for race on"]')!;
    expectActionName(deleteButton, 'Delete local record');
    click(deleteButton);
    const confirmButton = document.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-action"]')!;
    click(confirmButton);
    expect(onDelete).toHaveBeenCalledExactlyOnceWith(mockReceipt.id);
  });

  it('announces export confirmation and resets it after two seconds', () => {
    setup();
    const button = exportButton();
    const status = view!.container.querySelector('[role="status"]')!;
    expect(status).not.toBeNull();
    expect(status.textContent).toBe('');
    click(button);
    expectActionName(button, 'Exported ✓');
    expect(status.textContent).toContain('Exported JSON receipt for race on');
    expect(status.textContent).toContain(view!.container.querySelector('time')!.textContent);
    act(() => vi.advanceTimersByTime(1999));
    expect(button.textContent).toBe('Exported ✓');
    act(() => vi.advanceTimersByTime(1));
    expectActionName(button, 'Export JSON');
    expect(status.textContent).toBe('');
  });

  it('restarts confirmation timing when the same receipt is exported again', () => {
    setup();
    const button = exportButton();
    click(button);
    act(() => vi.advanceTimersByTime(1900));
    click(button);
    act(() => vi.advanceTimersByTime(100));
    expect(button.textContent).toBe('Exported ✓');
    act(() => vi.advanceTimersByTime(1899));
    expect(button.textContent).toBe('Exported ✓');
    act(() => vi.advanceTimersByTime(1));
    expect(button.textContent).toBe('Export JSON');
  });

  it('keeps confirmation timers independent for different receipts', () => {
    setup([mockReceipt, { ...mockReceipt, id: 'race-second' }]);
    const first = exportButton();
    const second = exportButton(1);
    click(first);
    act(() => vi.advanceTimersByTime(1000));
    click(second);
    act(() => vi.advanceTimersByTime(1000));
    expect(first.textContent).toBe('Export JSON');
    expect(second.textContent).toBe('Exported ✓');
    act(() => vi.advanceTimersByTime(1000));
    expect(second.textContent).toBe('Export JSON');
  });

  it('cancels pending export timers when unmounted', () => {
    setup();
    const beforeExport = vi.getTimerCount();
    click(exportButton());
    expect(vi.getTimerCount()).toBe(beforeExport + 1);
    view!.unmount();
    view = undefined;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps the creating-link and copied states in the share action name', async () => {
    let resolveShare!: (result: typeof share) => void;
    vi.mocked(createRaceShare).mockReturnValue(new Promise(resolve => { resolveShare = resolve; }));
    setup();
    const button = shareButton();
    click(button);
    expectActionName(button, 'Creating link…');
    expect(button.disabled).toBe(true);
    await act(async () => { resolveShare(share); });
    expectActionName(button, 'Link copied');
    expect(button.disabled).toBe(false);
    expect(view!.container.querySelector('input')!.value).toContain(`/share/${share.shareId}`);
  });

  it('keeps retry feedback in the share action name after a service failure', async () => {
    vi.mocked(createRaceShare).mockRejectedValue(new Error('Service unavailable'));
    setup();
    await act(async () => { click(shareButton()); });
    expectActionName(shareButton(), 'Retry share');
    expect(view!.container.querySelector('[role="alert"]')!.textContent).toContain('unavailable');
  });

  it('keeps the copy action in the name when clipboard access is denied', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error('Clipboard denied'));
    setup();
    await act(async () => { click(shareButton()); });
    expectActionName(shareButton(), 'Copy share link');
    expect(view!.container.querySelector('input')!.value).toContain(`/share/${share.shareId}`);
    vi.mocked(navigator.clipboard.writeText).mockResolvedValue(undefined);
    await act(async () => { click(shareButton()); });
    expectActionName(shareButton(), 'Link copied');
  });

  it.each([
    { totals: [null], statuses: ['completed'], expected: 'model-0' },
    { totals: [null, null], statuses: ['completed', 'completed'], expected: 'model-0' },
    { totals: [null, 10], statuses: ['completed', 'completed'], expected: 'model-1' },
    { totals: [10, null], statuses: ['completed', 'completed'], expected: 'model-0' },
    { totals: [20, 10, 10], statuses: ['completed', 'completed', 'completed'], expected: 'model-1' },
    { totals: [0, 10], statuses: ['completed', 'completed'], expected: 'model-0' },
    { totals: [1, 20], statuses: ['failed', 'completed'], expected: 'model-1' },
    { totals: [1, null], statuses: ['failed', 'completed'], expected: 'model-1' },
    { totals: [1, 20], statuses: ['failed', 'failed'], expected: 'No completed lane' },
    { totals: [], statuses: [], expected: 'No completed lane' },
  ] as const)('selects the first fastest completed lane: $totals / $statuses', ({ totals, statuses, expected }) => {
    const receipt = {
      ...mockReceipt,
      lanes: totals.map((totalMs, index) => ({
        ...mockReceipt.lanes[0],
        modelId: `model-${index}`,
        browser: { ttftMs: null, totalMs },
        status: statuses[index]!,
      })),
    };
    const before = JSON.stringify(receipt);
    setup([receipt]);
    expect(view!.container.querySelector('.race-history-row strong')!.textContent).toBe(expected);
    expect(JSON.stringify(receipt)).toBe(before);
  });

  it('refreshes the default date formatting on a later render', () => {
    setup();
    const firstDate = view!.container.querySelector('time')!.textContent;
    const NativeDateTimeFormat = Intl.DateTimeFormat;
    // Model changed browser locale/timezone defaults while retaining real ICU formatting.
    const expected = new NativeDateTimeFormat('de-DE', {
      dateStyle: 'medium', timeStyle: 'short', timeZone: 'Pacific/Honolulu',
    }).format(new Date(mockReceipt.createdAt));
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function (locales, options) {
      return new NativeDateTimeFormat(locales ?? 'de-DE', { ...options, timeZone: 'Pacific/Honolulu' });
    });
    view!.rerender(<RaceHistory receipts={[mockReceipt]} onDelete={() => {}} onClear={() => {}} />);
    expect(view!.container.querySelector('time')!.textContent).toBe(expected);
    expect(expected).not.toBe(firstDate);
  });

  it('constructs one date formatter for multiple receipts in a render', () => {
    const NativeDateTimeFormat = Intl.DateTimeFormat;
    const formatter = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function (locales, options) {
      return new NativeDateTimeFormat(locales, options);
    });
    setup([mockReceipt, { ...mockReceipt, id: 'second' }, { ...mockReceipt, id: 'third' }]);
    expect(view!.container.querySelectorAll('time')).toHaveLength(3);
    expect(formatter).toHaveBeenCalledExactlyOnceWith(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  });

});
