import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

export function mount(node: ReactNode) {
  const container = document.createElement('div');
  document.body.append(container);
  let root: Root;
  act(() => { root = createRoot(container); root.render(node); });
  return {
    container,
    rerender(next: ReactNode) { act(() => root.render(next)); },
    unmount() { act(() => root.unmount()); container.remove(); },
  };
}

export function inputValue(input: HTMLInputElement, value: string) {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  act(() => { set.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
}

export function click(element: HTMLElement) { act(() => element.click()); }
export function key(element: HTMLElement, key: string, shiftKey = false) {
  act(() => element.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true })));
}
