/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // output: 'export', // Removed to enable API routes and AVIF support
};

module.exports = nextConfig;
