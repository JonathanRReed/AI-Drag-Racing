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
