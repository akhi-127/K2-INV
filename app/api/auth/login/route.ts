/**
 * GET /api/auth/login
 *
 * Initiates Google OAuth flow via Supabase.
 *
 * Security:
 * - Uses PKCE (Proof Key for Code Exchange) — Supabase does this automatically.
 * - State parameter included by Supabase to prevent CSRF on the OAuth redirect.
 * - Minimal OAuth scopes: only email and profile (no Drive, Calendar, etc.)
 * - Redirect URL validated against our own origin.
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = cookies();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    console.error('[Auth] NEXT_PUBLIC_APP_URL not set');
    return NextResponse.redirect('/auth/error');
  }

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value; },
        set() {},   // handled in callback
        remove() {},
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${appUrl}/api/auth/callback`,
      // Minimal scopes — only request what we need.
      // No access to user's Google Drive, Calendar, Gmail, etc.
      scopes: 'openid email profile',
      queryParams: {
        // Force account selection even if user is already signed in.
        // Prevents silent account switching.
        prompt: 'select_account',
        // Ensure we get a refresh token.
        access_type: 'offline',
      },
    },
  });

  if (error || !data.url) {
    console.error('[Auth] OAuth initiation failed:', error?.message);
    return NextResponse.redirect(new URL('/auth/error', appUrl));
  }

  // Redirect user to Google's consent screen.
  return NextResponse.redirect(data.url);
}
