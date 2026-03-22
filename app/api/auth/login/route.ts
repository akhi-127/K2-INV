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
        get(name: string) { return cookieStore.get(name)?.value; },
        set(_name: string, _value: string, _options: Record<string, unknown>) {},
        remove(_name: string, _options: Record<string, unknown>) {},
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${appUrl}/api/auth/callback`,
      scopes: 'openid email profile',
      queryParams: {
        prompt: 'select_account',
        access_type: 'offline',
      },
    },
  });

  if (error || !data.url) {
    console.error('[Auth] OAuth initiation failed:', error?.message);
    return NextResponse.redirect(new URL('/auth/error', appUrl));
  }

  return NextResponse.redirect(data.url);
}
