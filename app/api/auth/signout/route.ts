/**
 * POST /api/auth/signout
 *
 * Security:
 * - POST method only (GET sign-out is vulnerable to CSRF via img tags).
 * - Destroys the server-side session.
 * - Clears the session cookie.
 */

import { NextResponse } from 'next/server';
import { getSession } from '../../../lib/session';

export async function POST() {
  const session = await getSession();

  // Destroy the session data.
  session.destroy();

  return NextResponse.json({ success: true });
}
