import { redirect } from 'next/navigation';
import { getSession, isSessionValid } from '../lib/session';
import { getWorkspaceState, getActivityLog } from '../lib/supabase';
import AppShell from '../components/AppShell';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session.userId) redirect('/');
  if (!isSessionValid(session)) { session.destroy(); redirect('/?expired=1'); }

  let initialState = null, initialActivity = [], initialUpdatedBy = '', initialUpdatedAt = '';
  try {
    const [workspace, activity] = await Promise.all([
      getWorkspaceState(),
      getActivityLog(),
    ]);
    initialState = workspace.state ?? null;
    initialActivity = activity;
    initialUpdatedBy = workspace.updated_by ?? '';
    initialUpdatedAt = workspace.updated_at ?? '';
  } catch { console.error('[Dashboard] Failed to load initial state'); }

  return (
    <AppShell
      userEmail={session.email}
      initialState={initialState}
      initialActivity={initialActivity}
      initialUpdatedBy={initialUpdatedBy}
      initialUpdatedAt={initialUpdatedAt}
    />
  );
}
