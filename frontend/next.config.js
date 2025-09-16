/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // appDir: true, // This is deprecated in Next.js 15
  },
  // Let Next.js generate a new buildId per build so chunk URLs rotate correctly
  async headers() {
    return [
      {
        source: '/admin/creators-ftu-calls',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      {
        source: '/_next/static/chunks/app/admin/creators-ftu-calls/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      }
    ]
  },
}

module.exports = nextConfig
