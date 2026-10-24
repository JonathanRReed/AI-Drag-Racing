// @vitest-environment happy-dom
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PromptInput from '../components/main/PromptInput';
import { measurePromptCharacters } from '../utils/promptCharacters';
import { click, mount } from './reactDom';

let view: ReturnType<typeof mount> | undefined;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); });
afterEach(() => {
  view?.unmount();
  view = undefined;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('prompt character counter', () => {
  it.each(['🤖', 'e\u0301', '👨‍👩‍👧‍👦', '🇺🇸'])('counts %s as one visible character', (prompt) => {
    expect(measurePromptCharacters(prompt)).toEqual({ count: 1, label: '1 character', shortUnit: 'char' });
  });

  it('labels the fallback as code points when segmentation is unavailable', () => {
    vi.stubGlobal('Intl', { Segmenter: undefined });
    expect(measurePromptCharacters('🇺🇸')).toEqual({ count: 2, label: '2 code points', shortUnit: 'code point' });
  });

  it('reuses one segmenter across different prompts', () => {
    const NativeSegmenter = Intl.Segmenter;
    const Segmenter = vi.fn(function (...args: ConstructorParameters<typeof Intl.Segmenter>) {
      return new NativeSegmenter(...args);
    });
    vi.stubGlobal('Intl', { Segmenter });

    expect(measurePromptCharacters('A🤖').count).toBe(2);
    expect(measurePromptCharacters('e\u0301 🇺🇸').count).toBe(3);
    expect(measurePromptCharacters('').count).toBe(0);
    expect(Segmenter).toHaveBeenCalledExactlyOnceWith(undefined, { granularity: 'grapheme' });
  });

  it('constructs a fresh segmenter after its constructor is replaced', () => {
    const NativeSegmenter = Intl.Segmenter;
    const firstConstructor = vi.fn(function (...args: ConstructorParameters<typeof Intl.Segmenter>) {
      return new NativeSegmenter(...args);
    });
    vi.stubGlobal('Intl', { Segmenter: firstConstructor });
    expect(measurePromptCharacters('🤖').count).toBe(1);

    const replacementConstructor = vi.fn(function (...args: ConstructorParameters<typeof Intl.Segmenter>) {
      return new NativeSegmenter(...args);
    });
    vi.stubGlobal('Intl', { Segmenter: replacementConstructor });
    expect(measurePromptCharacters('🇺🇸').count).toBe(1);
    expect(measurePromptCharacters('e\u0301').count).toBe(1);
    expect(firstConstructor).toHaveBeenCalledTimes(1);
    expect(replacementConstructor).toHaveBeenCalledExactlyOnceWith(undefined, { granularity: 'grapheme' });
  });

  it('uses code points when segmentation becomes unavailable after caching', () => {
    const NativeSegmenter = Intl.Segmenter;
    const Segmenter = vi.fn(function (...args: ConstructorParameters<typeof Intl.Segmenter>) {
      return new NativeSegmenter(...args);
    });
    vi.stubGlobal('Intl', { Segmenter });
    expect(measurePromptCharacters('🇺🇸')).toEqual({ count: 1, label: '1 character', shortUnit: 'char' });

    vi.stubGlobal('Intl', { Segmenter: undefined });
    expect(measurePromptCharacters('🇺🇸')).toEqual({ count: 2, label: '2 code points', shortUnit: 'code point' });
    vi.stubGlobal('Intl', undefined);
    expect(measurePromptCharacters('e\u0301')).toEqual({ count: 2, label: '2 code points', shortUnit: 'code point' });
    expect(Segmenter).toHaveBeenCalledTimes(1);
  });

  it('defers browser-dependent counter markup until hydration', () => {
    const html = renderToStaticMarkup(
      <PromptInput prompt="A normal prompt" onPromptChange={() => {}} onSubmit={() => {}} isLoading={false} />
    );
    expect(html).not.toMatch(/aria-label="\d+ characters?"/);
  });

  it('renders start button with contextual tooltip when disabled or loading', () => {
    const htmlNoPrompt = renderToStaticMarkup(
      <PromptInput prompt="" onPromptChange={() => {}} onSubmit={() => {}} isLoading={false} />
    );
    expect(htmlNoPrompt).toContain('title="Enter a prompt to start"');
    expect(htmlNoPrompt).toContain('disabled=""');

    const htmlDisabled = renderToStaticMarkup(
      <PromptInput prompt="Hello" onPromptChange={() => {}} onSubmit={() => {}} isLoading={false} disabled={true} />
    );
    expect(htmlDisabled).toContain('title="Select a model from an enabled provider with an API key"');
    expect(htmlDisabled).toContain('disabled=""');

    const htmlLoading = renderToStaticMarkup(
      <PromptInput prompt="Hello" onPromptChange={() => {}} onSubmit={() => {}} isLoading={true} />
    );
    expect(htmlLoading).toContain('title="Race in progress"');
    expect(htmlLoading).toContain('disabled=""');

    const htmlBothDisabledAndLoading = renderToStaticMarkup(
      <PromptInput prompt="Hello" onPromptChange={() => {}} onSubmit={() => {}} isLoading={true} disabled={true} />
    );
    expect(htmlBothDisabledAndLoading).toContain('title="Race in progress"');

    const htmlReady = renderToStaticMarkup(
      <PromptInput prompt="Hello" onPromptChange={() => {}} onSubmit={() => {}} isLoading={false} disabled={false} />
    );
    expect(htmlReady).toContain('title="Start race with prompt"');
    expect(htmlReady).not.toContain('disabled=""');
  });

  it('submits once when ready and never when disabled', () => {
    const onSubmit = vi.fn();
    view = mount(<PromptInput prompt="Hello" onPromptChange={() => {}} onSubmit={onSubmit} isLoading={false} disabled={true} />);

    const startBtn = view.container.querySelector('button[aria-label="Start Race"]') as HTMLButtonElement;
    expect(startBtn.disabled).toBe(true);
    click(startBtn);
    expect(onSubmit).not.toHaveBeenCalled();

    view.rerender(<PromptInput prompt="Hello" onPromptChange={() => {}} onSubmit={onSubmit} isLoading={false} disabled={false} />);
    expect(startBtn.disabled).toBe(false);
    click(startBtn);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('associates the prompt with helper text for submitting and adding lines', () => {
    view = mount(<PromptInput prompt="Hello" onPromptChange={() => {}} onSubmit={() => {}} isLoading={false} />);
    const textarea = view.container.querySelector('textarea')!;
    const hint = document.getElementById(textarea.getAttribute('aria-describedby')!);
    expect(hint).not.toBeNull();
    expect(hint!.textContent).toContain('Enter starts race.');
    expect(hint!.textContent).toContain('Shift+Enter adds line.');
  });

  function mountControlledPrompt(isLoading = false, initialPrompt = 'Sample prompt') {
    const onPromptChange = vi.fn();
    const onSubmit = vi.fn();
    const onFormSubmit = vi.fn();
    function ControlledPrompt() {
      const [prompt, setPrompt] = React.useState(initialPrompt);
      return (
        <form onSubmit={(event) => { event.preventDefault(); onFormSubmit(); }}>
          <PromptInput prompt={prompt} onPromptChange={(value) => {
            onPromptChange(value);
            setPrompt(value);
          }} onSubmit={onSubmit} isLoading={isLoading} />
        </form>
      );
    }
    view = mount(<ControlledPrompt />);
    const textarea = view.container.querySelector('textarea')!;
    return { textarea, onPromptChange, onSubmit, onFormSubmit };
  }

  it('clears the controlled prompt using the clear button', () => {
    const { textarea, onPromptChange, onSubmit, onFormSubmit } = mountControlledPrompt();
    click(view!.container.querySelector<HTMLButtonElement>('button[aria-label="Clear prompt text"]')!);
    expect(textarea.value).toBe('');
    expect(onPromptChange).toHaveBeenCalledExactlyOnceWith('');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(view!.container.querySelector('button[aria-label="Clear prompt text"]')).toBeNull();
    expect(onFormSubmit).not.toHaveBeenCalled();
  });

  it('clears the controlled prompt with Escape independently of the clear button', () => {
    const { textarea, onPromptChange, onSubmit } = mountControlledPrompt();
    act(() => textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(textarea.value).toBe('');
    expect(onPromptChange).toHaveBeenCalledExactlyOnceWith('');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it.each(['Escape', 'Enter'])('does not treat composing %s as a prompt shortcut', (key) => {
    const { textarea, onPromptChange, onSubmit } = mountControlledPrompt();
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, isComposing: true });
    act(() => textarea.dispatchEvent(event));
    expect(textarea.value).toBe('Sample prompt');
    expect(onPromptChange).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it.each(['Escape', 'Enter'])('preserves the prompt for IME keyCode 229 on %s', (key) => {
    const { textarea, onPromptChange, onSubmit } = mountControlledPrompt();
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    Object.defineProperty(event, 'keyCode', { value: 229 });
    act(() => textarea.dispatchEvent(event));
    expect(textarea.value).toBe('Sample prompt');
    expect(onPromptChange).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('does not clear a prompt while a race is loading', () => {
    const { textarea, onPromptChange } = mountControlledPrompt(true);
    expect(view!.container.querySelector('button[aria-label="Clear prompt text"]')).toBeNull();
    act(() => textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(textarea.value).toBe('Sample prompt');
    expect(onPromptChange).not.toHaveBeenCalled();
  });

  it('does not fire a redundant clear action for an empty prompt', () => {
    const { textarea, onPromptChange } = mountControlledPrompt(false, '');
    expect(view!.container.querySelector('button[aria-label="Clear prompt text"]')).toBeNull();
    act(() => textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(onPromptChange).not.toHaveBeenCalled();
  });

  it('still submits once on ordinary Enter and leaves Shift+Enter for a new line', () => {
    const { textarea, onSubmit, onFormSubmit } = mountControlledPrompt();
    const newline = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true });
    act(() => textarea.dispatchEvent(newline));
    expect(newline.defaultPrevented).toBe(false);
    expect(onSubmit).not.toHaveBeenCalled();
    const submit = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    act(() => textarea.dispatchEvent(submit));
    expect(submit.defaultPrevented).toBe(true);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onFormSubmit).not.toHaveBeenCalled();
  });
});

describe('prompt start feedback', () => {
  const cases = [
    { prompt: '', disabled: false, isLoading: false, isCountingDown: false, reason: 'Enter a prompt to start' },
    { prompt: 'Hello', disabled: true, isLoading: false, isCountingDown: false, reason: 'Select a model from an enabled provider with an API key' },
    { prompt: '', disabled: true, isLoading: false, isCountingDown: false, reason: 'Enter a prompt and select a model from an enabled provider with an API key' },
    { prompt: 'Hello', disabled: false, isLoading: false, isCountingDown: true, reason: 'Countdown in progress' },
    { prompt: '', disabled: true, isLoading: true, isCountingDown: true, reason: 'Countdown in progress' },
    { prompt: '', disabled: true, isLoading: true, isCountingDown: false, reason: 'Race in progress' },
  ];

  it.each(cases)('shows and associates the reason "$reason" without replacing the Start action name', ({ reason, ...props }) => {
    const onSubmit = vi.fn();
    const onPromptChange = vi.fn();
    view = mount(<PromptInput {...props} onPromptChange={onPromptChange} onSubmit={onSubmit} />);
    const button = view.container.querySelector<HTMLButtonElement>('button[aria-label="Start Race"]')!;
    expect(button).not.toBeNull();
    expect(button.textContent).toBe('Start');
    expect(button.disabled).toBe(true);
    const description = document.getElementById(button.getAttribute('aria-describedby') ?? '');
    expect(description).not.toBeNull();
    expect(description!.textContent).toBe(reason);
    expect(description!.hidden).toBe(false);
    expect(description!.classList.contains('sr-only')).toBe(false);
    expect(description!.closest('[aria-live], [role="status"]')).toBeNull();
    click(button);
    act(() => view!.container.querySelector('textarea')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(onSubmit).not.toHaveBeenCalled();
    if (props.isLoading || props.isCountingDown) {
      expect(button.getAttribute('aria-busy')).toBe('true');
      const icon = button.querySelector('svg');
      expect(icon!.getAttribute('aria-hidden')).toBe('true');
      expect(icon!.classList.contains('animate-spin')).toBe(true);
      expect(view!.container.querySelector('[aria-label="Clear prompt text"]')).toBeNull();
      act(() => view!.container.querySelector('textarea')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
      expect(onPromptChange).not.toHaveBeenCalled();
    }
  });

  it('clears busy/setup feedback and keeps one-click submission when ready again', () => {
    const onSubmit = vi.fn();
    const props = { prompt: 'Hello', onPromptChange: vi.fn(), onSubmit };
    view = mount(<PromptInput {...props} isLoading isCountingDown />);
    const button = view.container.querySelector<HTMLButtonElement>('[aria-label="Start Race"]')!;
    view.rerender(<PromptInput {...props} isLoading />);
    expect(document.getElementById(button.getAttribute('aria-describedby')!)?.textContent).toBe('Race in progress');
    view.rerender(<PromptInput {...props} isLoading={false} />);
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-describedby')).toBeNull();
    expect(button.getAttribute('aria-busy')).not.toBe('true');
    expect(button.querySelector('.animate-spin')).toBeNull();
    click(button);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
