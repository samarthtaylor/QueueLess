/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['better-sqlite3'],
  outputFileTracingIncludes: {
    '/*': ['./database/queueless.sqlite'],
  },
}

export default nextConfig
