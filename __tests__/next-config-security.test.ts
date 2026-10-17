import { readFileSync } from 'node:fs';
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

    const staticHeaders = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
    for (const name of ['Strict-Transport-Security', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy', 'Content-Security-Policy']) {
      const line = staticHeaders.split('\n').find((line) => line.trimStart().startsWith(`${name}:`));
      expect(line, `${name} exists in static policy`).toBeDefined();
      expect(headerMap.get(name), `${name} matches static policy`).toBe(line!.slice(line!.indexOf(':') + 1).trim());
    }

    expect(headerMap.get('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains; preload');
    expect(headerMap.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headerMap.get('X-Frame-Options')).toBe('DENY');
    expect(headerMap.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(headerMap.get('X-XSS-Protection')).toBe('0');
    expect(headerMap.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), accelerometer=(), gyroscope=(), magnetometer=()');
    expect(headerMap.get('Content-Security-Policy')).toContain("default-src 'self'");
  });
});

