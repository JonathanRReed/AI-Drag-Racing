// Pages must use the audited native packaging path, even if dashboard settings drift.
require('./scripts/dependency-audit.cjs').verifyPagesBuildContext(__dirname);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Only the Pages artifact exports HTML. Local Next dev/start remain supported.
  ...(process.env.PAGES_BUILD === '1' ? { output: 'export' } : {}),
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
        headers: Object.entries(require('./lib/security-headers.json')).map(([key, value]) => ({ key, value })),
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

