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
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '0' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), accelerometer=(), gyroscope=(), magnetometer=()' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://unpkg.com; font-src 'self'; connect-src 'self' https://bgbqdzmgxkwstjihgeef.supabase.co https://cloudflareinsights.com https://api.openai.com https://api.groq.com https://api.anthropic.com https://generativelanguage.googleapis.com https://api.cohere.ai https://api.mistral.ai https://api.together.xyz https://api.fireworks.ai https://openrouter.ai https://api.moonshot.ai https://open.bigmodel.cn; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests" },
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

