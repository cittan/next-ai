/** @type {import('next').NextConfig} */
const backendOrigin = process.env.BACKEND_ORIGIN || 'http://localhost:3000';
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [],
  httpAgentOptions: { keepAlive: true },
  staticPageGenerationTimeout: 120,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;