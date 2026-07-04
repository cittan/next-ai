/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    'kafkajs',
    '@elastic/elasticsearch',
    'neo4j-driver',
    'pg',
    'ioredis',
    'minio',
    'pdf-parse',
    'mammoth',
  ],
  compress: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;