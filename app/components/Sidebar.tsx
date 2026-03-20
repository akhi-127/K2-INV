'use client';

type View = 'dashboard' | 'inventory' | 'build' | 'receiving';

interface Props {
  view: View;
  setView: (v: View) => void;
  userEmail: string;
  syncStatus: 'ok' | 'syncing' | 'offline';
  syncMsg: string;
  onSignOut: () => void;
}

export default function Sidebar({ view, setView, userEmail, syncStatus, syncMsg, onSignOut }: Props) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-name"><span className="brand-k">K2</span> Inventory</div>
        <div className="brand-sub mono">Platform v2</div>
      </div>

      <nav className="nav">
        <div className="nav-label">Overview</div>
        <NavBtn view="dashboard" current={view} setView={setView} icon={<DashIcon />}>Dashboard</NavBtn>

        <div className="nav-label">Management</div>
        <NavBtn view="inventory"  current={view} setView={setView} icon={<InvIcon />}>Inventory</NavBtn>
        <NavBtn view="build"      current={view} setView={setView} icon={<BattIcon />}>Battery Units</NavBtn>
        <NavBtn view="receiving"  current={view} setView={setView} icon={<StockIcon />}>New Stock</NavBtn>
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span className={`sync-dot${syncStatus === 'syncing' ? ' syncing' : syncStatus === 'offline' ? ' offline' : ''}`} />
          <span className="small">{syncMsg}</span>
        </div>
        <div className="small" style={{ marginBottom: 8, wordBreak: 'break-all', color: 'var(--faint)' }}>
          {userEmail}
        </div>
        <button className="sec" style={{ width: '100%', padding: '5px', fontSize: 11 }} onClick={onSignOut}>
          Sign Out
        </button>
      </div>
    </aside>
  );
}

function NavBtn({ view, current, setView, icon, children }: {
  view: View; current: View; setView: (v: View) => void;
  icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <button
      className={`nav-link${view === current ? ' active' : ''}`}
      onClick={() => setView(view)}
    >
      <span className="nav-icon">{icon}</span>
      {children}
    </button>
  );
}

// SVG icons
function DashIcon()  { return <svg viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".3"/></svg>; }
function InvIcon()   { return <svg viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="2" rx="1" fill="currentColor"/><rect x="1" y="7" width="14" height="2" rx="1" fill="currentColor" opacity=".6"/><rect x="1" y="11" width="10" height="2" rx="1" fill="currentColor" opacity=".4"/></svg>; }
function BattIcon()  { return <svg viewBox="0 0 16 16" fill="none"><rect x="2" y="8" width="12" height="6" rx="1.5" fill="currentColor" opacity=".7"/><rect x="5" y="5" width="6" height="4" rx="1" fill="currentColor" opacity=".5"/><rect x="7" y="2" width="2" height="4" rx="1" fill="currentColor" opacity=".4"/></svg>; }
function StockIcon() { return <svg viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><rect x="2" y="12" width="12" height="2" rx="1" fill="currentColor" opacity=".5"/></svg>; }
