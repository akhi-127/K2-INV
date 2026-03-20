/**
 * Session management using iron-session.
 *
 * Security properties:
 * - Session data is encrypted with AES-256 + HMAC using SESSION_SECRET.
 * - Stored in an HTTP-only cookie — JavaScript cannot access it.
 * - Secure flag ensures cookie only sent over HTTPS.
 * - SameSite=Strict prevents cross-site request forgery.
 * - Short TTL (24h) limits the window if a token is stolen.
 */

import { getIronSession, IronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  userId: string;
  email: string;
  // ISO timestamp — used to enforce absolute session expiry server-side
  // even if the cookie hasn't expired yet.
  createdAt: string;
}

// SESSION_SECRET must be at least 32 characters and stored in env vars.
// Never hardcode this. Generate with: openssl rand -hex 32
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error(
    'SESSION_SECRET environment variable must be set and at least 32 characters long.'
  );
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET,
  cookieName: 'k2_session',
  cookieOptions: {
    // HTTP-only: prevents JavaScript from accessing the cookie.
    // This mitigates XSS-based session theft.
    httpOnly: true,
    // Secure: only sent over HTTPS. Enforced in production.
    secure: process.env.NODE_ENV === 'production',
    // SameSite=Strict: cookie not sent on cross-origin requests.
    // This is the primary CSRF mitigation.
    sameSite: 'strict',
    // 24-hour session lifetime.
    maxAge: 60 * 60 * 24,
    path: '/',
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(cookies(), sessionOptions);
}

/**
 * Validate that a session is still fresh.
 * Defends against stolen long-lived sessions.
 */
export function isSessionValid(session: SessionData): boolean {
  const created = new Date(session.createdAt).getTime();
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours in ms
  return now - created < maxAge;
}
