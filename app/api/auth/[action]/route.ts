/**
 * POST /api/auth/login  — email + password sign in
 * POST /api/auth/signup — email + password account creation
 *
 * Security:
 * - Passwords handled by Supabase Auth (bcrypt, never stored in plaintext).
 * - Rate limited by middleware (5 req/min per IP).
 * - Generic error messages prevent user enumeration.
 * - Session created server-side with HTTP-only cookie on success.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/app/lib/session';
import { z } from 'zod';

// Validate the request body shape and email format.
const authSchema = z.object({
  email: z.string().email('Invalid email format').max(254),
  password: z.string().min(8, 'Password too short').max(128),
});

// Generic error for all auth failures — prevents email enumeration.
const AUTH_ERROR = 'Invalid credentials. Please check your email and password.';

async function handleAuth(request: NextRequest, isSignup: boolean) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const parsed = authSchema.safeParse(body);
  if (!parsed.success) {
    // Return the specific validation error here (it's our own schema, not DB info).
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;

  // Use the anon key ONLY for password auth — Supabase handles hashing.
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  let userId: string;
  let userEmail: string;

  if (isSignup) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error || !data.user) {
      // Don't reveal whether the email already exists.
      console.error('[Auth] Signup failed:', error?.status);
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 });
    }
    // If email confirmation is required, session will be null.
    if (!data.session) {
      return NextResponse.json({ requiresConfirmation: true });
    }
    userId = data.user.id;
    userEmail = data.user.email ?? email;
  } else {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      console.error('[Auth] Login failed:', error?.status);
      // Same error for wrong email and wrong password — prevents enumeration.
      return NextResponse.json({ error: AUTH_ERROR }, { status: 401 });
    }
    userId = data.user.id;
    userEmail = data.user.email ?? email;
  }

  // Create server-side session with HTTP-only cookie.
  const session = await getSession();
  session.userId = userId;
  session.email = userEmail;
  session.createdAt = new Date().toISOString();
  await session.save();

  return NextResponse.json({ success: true });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { action: string } }
) {
  const isSignup = params.action === 'signup';
  return handleAuth(request, isSignup);
}
