'use client';

/**
 * LoginClient — the login UI.
 *
 * Security:
 * - Primary auth is Google OAuth — no passwords stored at all.
 * - Email/password is a fallback using Supabase Auth (bcrypt hashing).
 * - All auth flows go through /api/auth/* routes — no Supabase keys in browser.
 * - Error messages are intentionally generic to prevent user enumeration.
 */

import { useState } from 'react';
import K2Mountain from './K2Mountain';

export default function LoginClient() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side validation — server validates again, this is just UX.
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    if (mode === 'signup') {
      if (password !== confirm) { setError('Passwords do not match.'); return; }
      if (password.length < 8)  { setError('Password must be at least 8 characters.'); return; }
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        // Send credentials — server handles auth, never stored in JS.
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Generic error — don't reveal whether email exists.
        setError(data.error ?? 'Authentication failed. Please try again.');
        return;
      }

      if (mode === 'signup') {
        setSuccess('Check your email to confirm your account, then sign in.');
        setMode('login');
        setPassword('');
        setConfirm('');
      } else {
        // Redirect to dashboard — session cookie set by server.
        window.location.href = '/dashboard';
      }
    } catch {
      setError('Connection error. Please check your internet and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      {/* K2 mountain watermark */}
      <K2Mountain style={{ position: 'fixed', bottom: 0, right: 0, width: '65vw', opacity: 0.04 }} />

      <div className="auth-box">
        <div className="auth-logo"><span>K2</span> Inventory</div>
        <div className="auth-sub">Platform v2 — sign in to access your data</div>

        {/* Google OAuth — preferred auth method */}
        <a href="/api/auth/login" className="google-btn">
          <GoogleIcon />
          Continue with Google
        </a>

        <div className="auth-divider">or</div>

        {/* Email/password fallback */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 18 }}>
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              className={`tab-btn${mode === m ? ' active' : ''}`}
              onClick={() => { setMode(m); setError(''); setSuccess(''); }}
              style={{ flex: 1 }}
            >
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              disabled={loading}
            />
          </div>

          {mode === 'signup' && (
            <div className="auth-field">
              <label htmlFor="confirm">Confirm Password</label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
          )}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          {error   && <div className="auth-err">{error}</div>}
          {success && <div className="auth-ok">{success}</div>}
        </form>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
