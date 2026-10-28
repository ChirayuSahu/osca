import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (no full node_modules at runtime)
  output: 'standalone',
  experimental: {
    // Import only the Radix primitives each page uses from the umbrella package
    optimizePackageImports: ['radix-ui'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // No framing (clickjacking)
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self' https://github.com" },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // URLs (search terms, repo ids) don't leak to other sites
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
        ],
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
}

export default nextConfig
