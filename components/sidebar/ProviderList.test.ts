import { expect, test } from 'vitest';
import { providerSlugs } from '../../utils/providerIcons';

test('provider logos use the verified Lobe icon names on the first request', () => {
  expect(providerSlugs('google')[0]).toBe('gemini');
  expect(providerSlugs('together')[0]).toBe('together');
  expect(providerSlugs('fireworks')[0]).toBe('fireworks');
  expect(providerSlugs('openai')[0]).toBe('openai');
});
