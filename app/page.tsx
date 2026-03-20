/**
 * / — Login page (server component)
 *
 * Security: checks session server-side before rendering.
 * If already logged in, redirect to dashboard immediately.
 * This prevents a logged-in user from seeing the login page.
 */

import { redirect } from 'next/navigation';
import { getSession } from './lib/session';
import LoginClient from './components/LoginClient';

export default async function LoginPage() {
  // Server-side session check — no flash of login page for authed users.
  const session = await getSession();
  if (session.userId) {
    redirect('/dashboard');
  }

  return <LoginClient />;
}
