import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Vercel deployment — no standalone output needed
  transpilePackages: ['thailand-address-database'],
  images: {
    formats: ['image/avif', 'image/webp'],
  },
}

export default nextConfig
