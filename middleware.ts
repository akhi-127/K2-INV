import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ── RATE LIMITING ──────────────────────────────────────────────
// Simple in-memory rate limiter.
// In production with multiple Vercel instances, use Redis instead
// (e.g. Upstash Redis with rate-limiter-flexible).
// For a single-team app this is sufficient.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string, maxRequests: number, windowSeconds: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true; // allowed
  }

  if (entry.count >= maxRequests) {
    return false; // blocked
  }

  entry.count++;
  return true; // allowed
}

// Clean up old entries every 5 minutes to prevent memory growth.
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap.entries()) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60 * 1000);

// ── ROUTE CONFIG ───────────────────────────────────────────────
// Public routes that don't require authentication.
const PUBLIC_ROUTES = ['/', '/auth/callback', '/auth/error'];

// Auth routes get a stricter rate limit (brute force protection).
const AUTH_ROUTES = ['/api/auth'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get real client IP. Vercel sets x-forwarded-for.
  // We use this for rate limiting, not for authentication decisions.
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1';

  // ── RATE LIMITING ────────────────────────────────────────────
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const maxReqs = isAuthRoute ? 5 : 60;
  const windowSecs = isAuthRoute ? 60 : 60;

  if (!rateLimit(ip, maxReqs, windowSecs)) {
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          // Tell client when the rate limit resets.
          'Retry-After': String(windowSecs),
        },
      }
    );
  }

  // ── ORIGIN VALIDATION ────────────────────────────────────────
  // For API routes, validate that requests come from our own origin.
  // This mitigates CSRF for non-cookie-based requests.
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

    if (origin && appUrl && !origin.startsWith(appUrl)) {
      return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // ── AUTH GUARD ───────────────────────────────────────────────
  // Session cookie check for protected routes.
  const isPublic = PUBLIC_ROUTES.includes(pathname);
  const isApiRoute = pathname.startsWith('/api/');

  if (!isPublic) {
    const sessionCookie = request.cookies.get('k2_session');

    if (!sessionCookie?.value) {
      if (isApiRoute) {
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      // Redirect to login for page routes.
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on all routes except Next.js internals and static files.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
