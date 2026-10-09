import type { NextConfig } from 'next';

// The browser only ever talks to the Next.js origin; /api/* is proxied to the Express backend.
// Same origin means the httpOnly session cookie just works and no CORS is needed in the browser.
const backend = process.env.BACKEND_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }];
  },
};

export default nextConfig;
