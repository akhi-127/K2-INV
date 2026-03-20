/** @type {import('next').NextConfig} */

// Security headers applied to every response.
// These cannot be set on GitHub Pages — this is why we use Next.js/Vercel.
const securityHeaders = [
  {
    // Prevent browsers from MIME-sniffing the content type.
    // Mitigates drive-by download attacks.
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    // Prevent the page from being embedded in an iframe anywhere.
    // Mitigates clickjacking attacks.
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    // Force HTTPS for 2 years, include subdomains.
    // Browser will refuse HTTP connections even if user types http://.
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    // Disable referrer for cross-origin requests.
    // Prevents leaking app URLs to third parties.
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    // Restrict browser features. We don't need camera, microphone, etc.
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  {
    // Content Security Policy — the main XSS defence at the HTTP level.
    // Only allows scripts/styles from our own origin + specific CDNs.
    // 'nonce' approach would be stronger but requires SSR per-request — 
    // this strict-src approach is a good balance for a team app.
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js needs 'unsafe-inline' for its inline styles in dev.
      // In production consider moving to nonces.
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      // No inline scripts. All JS must come from our origin.
      "script-src 'self'",
      // API calls only to our own origin and Supabase.
      "connect-src 'self' https://*.supabase.co",
      "img-src 'self' data: https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig = {
  headers: async () => [
    {
      // Apply security headers to all routes.
      source: '/(.*)',
      headers: securityHeaders,
    },
  ],

  // Prevent Next.js from exposing version info.
  poweredByHeader: false,

  // Only allow images from trusted sources.
  images: {
    domains: ['lh3.googleusercontent.com'], // Google profile pictures
  },
};

module.exports = nextConfig;
