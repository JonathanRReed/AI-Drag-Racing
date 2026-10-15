/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    reactCompiler: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '0' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), accelerometer=(), gyroscope=(), magnetometer=()' },
        ],
      },
    ];
  },
  webpack(config, { isServer, nextRuntime }) {
    if (!process.env.DEPENDENCY_AUDIT_RUN_ID) return config;
    const { createRuntimeModulePlugin } = require('./scripts/dependency-audit.cjs');
    const label = isServer ? (nextRuntime || 'nodejs') : 'browser';
    const plugin = createRuntimeModulePlugin(process.cwd(), label);
    if (plugin) config.plugins.push(plugin);
    return config;
  },
};

module.exports = nextConfig;

