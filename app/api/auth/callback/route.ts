import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSession } from '../../../lib/session';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    console.error('[Auth] OAuth error or missing code:', error ?? 'no code');
    return NextResponse.redirect(new URL('/auth/error', origin));
  }

  const response = NextResponse.redirect(new URL('/dashboard', origin));

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          response.cookies.set({ name, value, ...options } as Parameters<typeof response.cookies.set>[0]);
        },
        remove(name: string, options: Record<string, unknown>) {
          response.cookies.set({ name, value: '', ...options } as Parameters<typeof response.cookies.set>[0]);
        },
      },
    }
  );

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !data.user) {
    console.error('[Auth] Code exchange failed:', exchangeError?.message);
    return NextResponse.redirect(new URL('/auth/error', origin));
  }

  const session = await getSession();
  session.userId = data.user.id;
  session.email = data.user.email ?? '';
  session.createdAt = new Date().toISOString();
  await session.save();

  return response;
}
