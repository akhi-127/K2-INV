# K2 Inventory — Security Architecture

## Threat Model & Mitigations

| Threat              | Mitigation                                                    |
|---------------------|---------------------------------------------------------------|
| XSS                 | DOMPurify sanitization + strict CSP + output escaping        |
| CSRF                | SameSite=Strict cookies + origin validation                  |
| Session hijacking   | HTTP-only + Secure + SameSite cookies, short TTL             |
| Secrets exposure    | All keys in env vars, never in client bundle                 |
| Broken access       | Server-side session check on every API route                 |
| Injection           | Supabase parameterized queries only, no raw SQL              |
| Enumeration         | Generic auth error messages                                  |
| Brute force         | Rate limiting on auth endpoints (5 req/min per IP)           |
| Clickjacking        | X-Frame-Options: DENY                                        |
| Data in transit     | HTTPS enforced, HSTS header, Vercel TLS                      |
| Sensitive logs      | Errors logged without user data or stack traces to client    |

## Why not GitHub Pages?

GitHub Pages serves static files only — it cannot:
- Set HTTP-only cookies (needed for secure session tokens)
- Keep secrets server-side (all JS is visible in source)
- Rate limit requests
- Validate sessions before serving data
- Set security headers

This project uses Next.js on Vercel which solves all of these.

## Key Decisions

### Supabase anon key
The Supabase anon key is NOT exposed to the client in this architecture.
All database calls go through Next.js API routes using the SERVICE ROLE key,
which is stored in an environment variable and never sent to the browser.

### Authentication
Google OAuth via Supabase Auth — tokens are exchanged server-side,
session stored in HTTP-only cookie, never accessible to JavaScript.

### Row Level Security
Even though the backend uses the service role key, every query
explicitly filters by user_id from the verified session.
RLS is also enabled in Supabase as a second layer of defence.
