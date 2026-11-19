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
  reactCompiler: true,
  // Keep `next dev` from writing an AGENTS.md block into the repository.
  agentRules: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: Object.entries(require('./lib/security-headers.json')).map(([key, value]) => ({ key, value })),
      },
    ];
  },
  // Next 16 defaults to Turbopack, which has no compilation hooks. The dev and
  // build scripts pass --webpack so the Pages compiler provenance observer runs;
  // a Turbopack Pages build records no evidence and fails verification.
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

