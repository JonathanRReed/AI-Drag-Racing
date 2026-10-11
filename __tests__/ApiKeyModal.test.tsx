// @vitest-environment happy-dom
import React, { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ApiKeyModal from '../components/sidebar/ApiKeyModal';
import { click, inputValue, key, mount } from './reactDom';

let view: ReturnType<typeof mount>;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); });
afterEach(() => { view?.unmount(); document.body.innerHTML = ''; vi.unstubAllGlobals(); });
function setup() {
  const onSave = vi.fn();
  const onClose = vi.fn();
  view = mount(<ApiKeyModal isOpen onSave={onSave} onClose={onClose} providerName="OpenAI" />);
  return { onSave, onClose, input: view.container.querySelector('input')! };
}
const button = (label: string) => {
  const result = view.container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  expect(result, `${label} button exists`).not.toBeNull();
  return result!;
};
const saveButton = () => Array.from(view.container.querySelectorAll('button')).find(b => b.textContent === 'Save Key')!;

describe('API key dialog', () => {
  it('links the privacy description and labels every non-submit button', () => {
    setup();
    const dialog = view.container.querySelector('[role="dialog"]')!;
    const description = document.getElementById(dialog.getAttribute('aria-describedby')!);
    expect(description, 'dialog describes its privacy promise').not.toBeNull();
    expect(description!.textContent).toContain('kept only for this browser tab');
    expect(button('Close dialog')).toBeTruthy();
    for (const action of view.container.querySelectorAll('button')) {
      expect(action.type).toBe('button');
      expect(action.className).toContain('focus-visible:ring-2');
    }
  });

  it('reveals and hides the same key with an accessible pressed state', () => {
    const { input } = setup();
    inputValue(input, 'test-key');
    expect(input.type).toBe('password');
    expect(input.className).toContain('font-mono');
    click(button('Show API key'));
    expect(input.type).toBe('text');
    expect(input.value).toBe('test-key');
    expect(button('Hide API key').getAttribute('aria-pressed')).toBe('true');
    click(button('Hide API key'));
    expect(input.type).toBe('password');
    expect(button('Show API key').getAttribute('aria-pressed')).toBe('false');
  });

  it.each(['', '   ', '\n\t '])('does not save or close for a blank key %j, including Enter', value => {
    const { input, onSave, onClose } = setup();
    inputValue(input, value);
    expect(saveButton().disabled).toBe(true);
    key(input, 'Enter');
    click(saveButton());
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('saves a trimmed key once and closes', () => {
    const { input, onSave, onClose } = setup();
    inputValue(input, '  test-key  ');
    click(saveButton());
    expect(onSave).toHaveBeenCalledExactlyOnceWith('test-key');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('resets visibility after closing and reopening the same component', () => {
    const { onSave, onClose } = setup();
    click(button('Show API key'));
    view.rerender(<ApiKeyModal isOpen={false} onSave={onSave} onClose={onClose} providerName="OpenAI" />);
    view.rerender(<ApiKeyModal isOpen onSave={onSave} onClose={onClose} providerName="OpenAI" />);
    expect(view.container.querySelector('input')!.type).toBe('password');
    expect(button('Show API key').getAttribute('aria-pressed')).toBe('false');
  });

  it('traps boundary Tab focus and returns focus to the opener after Escape', () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return <><button onClick={() => setOpen(true)}>Open</button><ApiKeyModal isOpen={open} onSave={() => {}} onClose={() => setOpen(false)} providerName="OpenAI" /></>;
    }
    view = mount(<Harness />);
    const opener = view.container.querySelector('button')!;
    opener.focus();
    click(opener);
    expect(document.activeElement).toBe(view.container.querySelector('input'));
    const first = button('Close dialog');
    const cancel = Array.from(view.container.querySelectorAll('button')).find(b => b.textContent === 'Cancel')!;
    first.focus();
    key(first, 'Tab', true);
    expect(document.activeElement).toBe(cancel);
    key(cancel, 'Tab');
    expect(document.activeElement).toBe(first);
    key(first, 'Escape');
    expect(view.container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
