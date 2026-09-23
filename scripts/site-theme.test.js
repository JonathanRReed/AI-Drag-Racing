import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const scripts = [
  readFileSync(new URL('./site-theme.source.js', import.meta.url), 'utf8'),
  readFileSync(new URL('../public/site-theme.js', import.meta.url), 'utf8'),
];

function boot(script, saved = null, storageBlocked = false) {
  const events = new Map();
  const root = {
    dataset: {},
    classList: { light: false, toggle(_name, enabled) { this.light = enabled; } },
    style: {},
  };
  const meta = { content: '', setAttribute(_name, value) { this.content = value; } };
  const window = {};
  const localStorage = {
    getItem() {
      if (storageBlocked) throw new Error('storage blocked');
      return saved;
    },
    setItem(_key, value) {
      if (storageBlocked) throw new Error('storage blocked');
      saved = value;
    },
  };
  const document = {
    documentElement: root,
    querySelector() { return meta; },
    addEventListener(name, listener) { events.set(name, listener); },
  };
  runInNewContext(script, { window, document, localStorage });
  return { window, root, meta, events };
}

test('source and published theme scripts keep the saved choice across navigation', () => {
  for (const script of scripts) {
    const page = boot(script, 'light');
    expect(page.root.dataset.theme).toBe('light');
    expect(page.root.classList.light).toBe(true);
    expect(page.root.style.colorScheme).toBe('light');
    expect(page.meta.content).toBe('#f2f4ef');
    page.window.__ecoTheme.toggle();
    expect(page.root.dataset.theme).toBe('dark');
    expect(page.window.__ecoTheme.get()).toBe('dark');
    page.events.get('astro:after-swap')();
    expect(page.root.dataset.theme).toBe('dark');

    const blocked = boot(script, null, true);
    expect(blocked.root.dataset.theme).toBe('dark');
    blocked.window.__ecoTheme.toggle();
    expect(blocked.root.dataset.theme).toBe('light');
  }
});
