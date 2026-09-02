import { expect, test } from 'vitest';
import { assertSharedReact, verifyReactRuntime } from './verify-react-runtime.mjs';

test('release guard rejects a chart library linked to another React runtime', () => {
  expect(() => assertSharedReact([
    { name: 'react', path: '/app/react/index.js' },
    { name: 'react-chartjs-2', path: '/old-install/react/index.js' },
  ])).toThrow('multiple React runtimes');
});

test('installed app, renderer, and lazy chart share the same React runtime', () => {
  expect(verifyReactRuntime()).toHaveLength(3);
});
