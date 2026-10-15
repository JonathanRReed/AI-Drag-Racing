import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const nextConfig = require('../next.config.js');

describe('next.config.js security headers', () => {
  it('exports async headers function configured with standard security headers', async () => {
    expect(typeof nextConfig.headers).toBe('function');
    const headersConfig = await nextConfig.headers();

    expect(Array.isArray(headersConfig)).toBe(true);
    const globalHeaders = headersConfig.find((entry: { source: string }) => entry.source === '/:path*');
    expect(globalHeaders).toBeDefined();

    const headerMap = new Map(globalHeaders.headers.map((h: { key: string; value: string }) => [h.key, h.value]));

    expect(headerMap.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headerMap.get('X-Frame-Options')).toBe('DENY');
    expect(headerMap.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(headerMap.get('X-XSS-Protection')).toBe('1; mode=block');
    expect(headerMap.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()');
  });
});
