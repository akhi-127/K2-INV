/**
 * GET /api/auth/callback
 *
 * Handles the OAuth callback from Supabase/Google.
 *
 * Security:
 * - Token exchange happens server-side. The access token never touches
 *   the browser URL bar or JavaScript.
 * - State parameter validated by Supabase to prevent CSRF on the OAuth flow.
 * - Session created server-side with HTTP-only cookie.
 * - Generic error redirect — no auth details leaked in URL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSession } from '../../../lib/session';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // If OAuth provider returned an error, redirect to error page.
  // Don't include the raw error in the redirect — it may leak provider info.
  if (error || !code) {
    console.error('[Auth] OAuth error or missing code:', error ?? 'no code');
    return NextResponse.redirect(new URL('/auth/error', origin));
  }

  // Exchange the authorization code for a session.
  // This is done server-side so the access token never appears in the browser.
  const response = NextResponse.redirect(new URL('/dashboard', origin));

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    // Use anon key ONLY for the OAuth code exchange — this is one of the
    // few legitimate uses. All data API calls use the service role key.
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !data.user) {
    console.error('[Auth] Code exchange failed:', exchangeError?.message);
    return NextResponse.redirect(new URL('/auth/error', origin));
  }

  // Create our own HTTP-only session cookie.
  const session = await getSession();
  session.userId = data.user.id;
  session.email = data.user.email ?? '';
  session.createdAt = new Date().toISOString();
  await session.save();

  return response;
}
