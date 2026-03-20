// /auth/error — shown when OAuth fails
// Generic message — no provider-specific details exposed to user
export default function AuthError() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', fontFamily: 'Geist, sans-serif',
    }}>
      <div style={{ textAlign: 'center', color: 'var(--text)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠</div>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Sign-in failed</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
          There was a problem signing you in. Please try again.
        </div>
        <a href="/" style={{
          padding: '8px 20px', background: 'var(--accent)', color: '#111',
          borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600,
        }}>
          Back to Login
        </a>
      </div>
    </div>
  );
}
