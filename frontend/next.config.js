/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [],
  httpAgentOptions: { keepAlive: true },
  staticPageGenerationTimeout: 120,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*',
      },
      {
        source: '/admin/:path*',
        destination: 'http://localhost:3000/admin/:path*',
      },
      {
        source: '/manage/:path*',
        destination: 'http://localhost:3000/manage/:path*',
      },
    ];
  },
};

module.exports = nextConfig;