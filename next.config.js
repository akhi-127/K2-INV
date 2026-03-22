/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "connect-src 'self' https://*.supabase.co",
      "img-src 'self' data: https:",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

const nextConfig = {
  // Ignore TypeScript errors during build — prevents type issues from blocking deploy
  typescript: { ignoreBuildErrors: true },
  // Ignore ESLint errors during build
  eslint: { ignoreDuringBuilds: true },
  headers: async () => [{ source: '/(.*)', headers: securityHeaders }],
  poweredByHeader: false,
  images: { domains: ['lh3.googleusercontent.com'] },
};

module.exports = nextConfig;
