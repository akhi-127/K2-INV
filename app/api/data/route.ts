/**
 * GET  /api/data         — load shared workspace state + activity log
 * POST /api/data         — save shared workspace state
 * GET  /api/data/activity — get activity log only
 *
 * All authenticated users share the same workspace.
 * The userEmail from session is recorded in every save.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, isSessionValid } from '../../lib/session';
import { getWorkspaceState, saveWorkspaceState, logActivity, getActivityLog } from '../../lib/supabase';
import { validateState } from '../../lib/validation';

async function requireAuth() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isSessionValid(session)) {
    session.destroy();
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }
  return { userId: session.userId, email: session.email };
}

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const [workspace, activity] = await Promise.all([
      getWorkspaceState(),
      getActivityLog(),
    ]);
    return NextResponse.json({
      state: workspace.state ?? null,
      updatedBy: workspace.updated_by,
      updatedAt: workspace.updated_at,
      activity,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  // Body shape: { state, action?, detail? }
  const { state: rawState, action = 'Updated inventory', detail = '' } = body as Record<string, unknown>;

  const validation = validateState(rawState);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    await saveWorkspaceState(validation.data, auth.email);
    // Log who did what — non-blocking
    logActivity(auth.email, String(action), String(detail)).catch(() => {});
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
