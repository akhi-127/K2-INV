/**
 * Server-side Supabase client — SHARED WORKSPACE MODEL
 *
 * All team members share ONE workspace row.
 * Activity log records who changed what.
 * Service role key never leaves the server.
 */

import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL) throw new Error('SUPABASE_URL not set');
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set');

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const WORKSPACE_ID = 'k2-main';

/** Load the shared workspace state. Same for all users. */
export async function getWorkspaceState() {
  const { data, error } = await supabaseAdmin
    .from('workspace')
    .select('state, updated_at, updated_by')
    .eq('id', WORKSPACE_ID)
    .single();

  if (error) {
    console.error('[DB] getWorkspaceState failed:', error.code);
    throw new Error('Failed to load workspace');
  }
  return data;
}

/** Save to shared workspace. Any team member can save. */
export async function saveWorkspaceState(state: unknown, userEmail: string) {
  const { error } = await supabaseAdmin
    .from('workspace')
    .update({ state, updated_at: new Date().toISOString(), updated_by: userEmail })
    .eq('id', WORKSPACE_ID);

  if (error) {
    console.error('[DB] saveWorkspaceState failed:', error.code);
    throw new Error('Failed to save workspace');
  }
}

/** Log an activity. Called alongside every save. */
export async function logActivity(userEmail: string, action: string, detail = '') {
  await supabaseAdmin
    .from('activity_log')
    .insert({ user_email: userEmail, action, detail });
  // Non-fatal — don't throw if logging fails.
}

/** Get recent activity log (last 30 entries). */
export async function getActivityLog() {
  const { data, error } = await supabaseAdmin
    .from('activity_log')
    .select('id, user_email, action, detail, created_at')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('[DB] getActivityLog failed:', error.code);
    return [];
  }
  return data ?? [];
}
