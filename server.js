require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { z } = require('zod');
const path = require('path');

const app = express();
const SECRET = process.env.SESSION_SECRET || 'changeme-32-chars-minimum-secret!!';

// ── SUPABASE ──────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── MIDDLEWARE ────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting
const authLimiter = rateLimit({ windowMs: 60000, max: 10 });
const apiLimiter  = rateLimit({ windowMs: 60000, max: 120 });
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// ── JWT SESSION HELPERS ───────────────────────────────────────
// JWT stored in HTTP-only cookie — works across all Vercel serverless instances
function setSession(res, userId, email) {
  const token = jwt.sign({ userId, email }, SECRET, { expiresIn: '24h' });
  res.cookie('k2_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',  // lax allows OAuth redirects
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function getSession(req) {
  const token = req.cookies?.k2_token;
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

function clearSession(res) {
  res.clearCookie('k2_token', { path: '/' });
}

// ── AUTH MIDDLEWARE ───────────────────────────────────────────
function requireAuth(req, res, next) {
  const session = getSession(req);
  if (!session) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.redirect('/');
  }
  req.user = session;
  next();
}

// ── VALIDATION ────────────────────────────────────────────────
const stateSchema = z.object({
  inventory: z.array(z.object({
    item: z.string().trim().min(1).max(200),
    unit: z.enum(['pcs', 'mm']),
    initial: z.number().min(0).max(1000000),
    received: z.number().min(0).max(1000000),
    qtyPerUnit: z.number().min(0).max(100000),
    reorder: z.number().min(0).max(1000000),
  })).max(10000),
  buildLog: z.array(z.object({
    date: z.string().max(50),
    unitsBuilt: z.number().int().min(0).max(10000),
    unitId: z.string().max(50).optional(),
  })).max(100000),
  receiving: z.array(z.object({
    date: z.string().max(50),
    item: z.string().trim().min(1).max(200),
    qty: z.number().min(0).max(1000000),
    inputQty: z.number().min(0).max(1000000),
    inputUnit: z.enum(['pcs', 'mm', 'ft', 'in']),
    po: z.string().max(100).default(''),
    supplier: z.string().max(100).default(''),
    notes: z.string().max(500).default(''),
  })).max(100000),
  batteryUnits: z.array(z.object({
    id: z.string().trim().min(1).max(50),
    date: z.string().max(20).default(''),
    ip: z.string().max(45).default(''),
    serial: z.string().max(100).default(''),
    status: z.enum(['Assembly', 'In QC', 'Ready to Ship', 'Shipped', 'Returned/Refurbished']),
  })).max(100000),
});

// ── DB HELPERS ────────────────────────────────────────────────
const WORKSPACE_ID = 'k2-main';

async function getWorkspace() {
  const { data, error } = await supabase
    .from('workspace')
    .select('state, updated_at, updated_by')
    .eq('id', WORKSPACE_ID)
    .single();
  if (error) throw new Error('Failed to load workspace');
  return data;
}

async function saveWorkspace(state, userEmail) {
  const { error } = await supabase
    .from('workspace')
    .update({ state, updated_at: new Date().toISOString(), updated_by: userEmail })
    .eq('id', WORKSPACE_ID);
  if (error) throw new Error('Failed to save workspace');
}

async function logActivity(userEmail, action, detail = '') {
  try {
    await supabase.from('activity_log').insert({ user_email: userEmail, action, detail });
  } catch(e) { /* non-fatal */ }
}

async function getActivity() {
  const { data } = await supabase
    .from('activity_log')
    .select('id, user_email, action, detail, created_at')
    .order('created_at', { ascending: false })
    .limit(30);
  return data || [];
}

// ── AUTH ROUTES ───────────────────────────────────────────────

// Email login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });
  if (error || !data.user) return res.status(401).json({ error: 'Invalid email or password' });
  setSession(res, data.user.id, data.user.email);
  res.json({ success: true });
});

// Email signup
app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  const { data, error } = await supabaseAnon.auth.signUp({ email, password });
  if (error) return res.status(400).json({ error: error.message });
  if (!data.session) return res.json({ requiresConfirmation: true });
  setSession(res, data.user.id, data.user.email);
  res.json({ success: true });
});

// Google OAuth — initiate
app.get('/api/auth/google', async (req, res) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.host}`;
  const { data, error } = await supabaseAnon.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${appUrl}/api/auth/callback`,
      scopes: 'openid email profile',
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error || !data.url) return res.redirect('/auth/error');
  res.redirect(data.url);
});

// Google OAuth — callback
app.get('/api/auth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.redirect('/auth/error');
  const { data, error } = await supabaseAnon.auth.exchangeCodeForSession(String(code));
  if (error || !data.user) return res.redirect('/auth/error');
  setSession(res, data.user.id, data.user.email);
  res.redirect('/dashboard');
});

// Sign out
app.post('/api/auth/signout', (req, res) => {
  clearSession(res);
  res.json({ success: true });
});

// Who am I
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ email: req.user.email, userId: req.user.userId });
});

// ── DATA ROUTES ───────────────────────────────────────────────

app.get('/api/data', requireAuth, async (req, res) => {
  try {
    const [workspace, activity] = await Promise.all([getWorkspace(), getActivity()]);
    res.json({ state: workspace.state, updatedBy: workspace.updated_by, updatedAt: workspace.updated_at, activity });
  } catch(e) {
    res.status(500).json({ error: 'Failed to load data' });
  }
});

app.post('/api/data', requireAuth, async (req, res) => {
  const { state: rawState, action = 'Updated inventory', detail = '' } = req.body;
  const result = stateSchema.safeParse(rawState);
  if (!result.success) return res.status(400).json({ error: result.error.errors[0].message });
  try {
    await saveWorkspace(result.data, req.user.email);
    logActivity(req.user.email, String(action), String(detail));
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// ── PAGES ─────────────────────────────────────────────────────

app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

app.get('/auth/error', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'error.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  const session = getSession(req);
  if (session) return res.redirect('/dashboard');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── EXPORT FOR VERCEL ─────────────────────────────────────────
// Vercel needs module.exports, NOT app.listen()
module.exports = app;

// Also listen locally for development
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`K2 running on http://localhost:${PORT}`));
}
