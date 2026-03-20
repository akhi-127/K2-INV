'use client';

import type { AppState, ActivityEntry } from '../../lib/api-client';
import type { DerivedItem } from '../AppShell';
import { getStatus, fmt } from '../AppShell';

interface Props {
  derived: DerivedItem[];
  state: AppState;
  activity: ActivityEntry[];
  lastUpdatedBy: string;
  lastUpdatedAt: string;
}

function timeAgo(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Initials avatar from email
function Avatar({ email }: { email: string }) {
  const initials = email.split('@')[0].slice(0, 2).toUpperCase();
  const colors = ['#c8a96e', '#5aaa7a', '#7ab0ff', '#d4a843', '#a080ff'];
  const color = colors[email.charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: 26, height: 26, borderRadius: '50%',
      background: color + '22', border: `1px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 700, color, flexShrink: 0,
    }}>{initials}</div>
  );
}

export default function Dashboard({ derived, state, activity, lastUpdatedBy, lastUpdatedAt }: Props) {
  const low = derived.filter(r => getStatus(r) === 'low').length;
  const critical = derived.filter(r => getStatus(r) === 'critical').length;
  const possible = derived.map(r => r.possibleUnits).filter(v => v > 0);
  const buildable = possible.length ? Math.min(...possible) : 0;
  const alerts = derived.filter(r => getStatus(r) !== 'healthy')
    .sort((a, b) => (getStatus(a) === 'critical' ? -1 : 1));
  const bottlenecks = [...derived].filter(r => r.qtyPerUnit > 0)
    .sort((a, b) => a.possibleUnits - b.possibleUnits);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">
            Shared workspace
            {lastUpdatedBy && (
              <span style={{ marginLeft: 8, color: 'var(--faint)' }}>
                · Last edit by <b style={{ color: 'var(--accent2)' }}>{lastUpdatedBy.split('@')[0]}</b> {timeAgo(lastUpdatedAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="cards">
        <div className="card card-accent">
          <div className="lbl">Total Items</div>
          <div className="num">{derived.length}</div>
          <div className="num-sub">tracked components</div>
        </div>
        <div className="card card-warn">
          <div className="lbl">Low Stock</div>
          <div className="num">{low}</div>
          <div className="num-sub">near reorder level</div>
        </div>
        <div className="card card-danger">
          <div className="lbl">Critical</div>
          <div className="num">{critical}</div>
          <div className="num-sub">below reorder level</div>
        </div>
        <div className="card card-ok">
          <div className="lbl">Max Buildable</div>
          <div className="num">{derived.length ? buildable : '—'}</div>
          <div className="num-sub">units from current stock</div>
        </div>
      </div>

      {/* Two-column layout: alerts + activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14, marginBottom: 14 }}>

        {/* Alerts or all-good message */}
        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-title">
            {alerts.length > 0 ? '⚠ Stock Alerts' : '✓ Stock Health'}
            <span className="panel-title-line" />
          </div>
          {alerts.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
              <div style={{ color: 'var(--ok)', fontWeight: 600 }}>All items healthy</div>
              <div className="small" style={{ marginTop: 4 }}>No stock alerts right now</div>
            </div>
          ) : (
            <div className="alert-list">
              {alerts.map(r => {
                const st = getStatus(r);
                return (
                  <div key={r.item} className={`alert-row ${st}`}>
                    <div>
                      <div className="alert-name">{r.item}</div>
                      <div className="alert-detail">
                        {st === 'critical' ? 'Below' : 'Near'} reorder —{' '}
                        {fmt(r.remaining)} {r.unit} remaining, reorder at {fmt(r.reorder)}
                      </div>
                    </div>
                    <span className={`badge badge-${st}`}>{st}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity feed — who did what */}
        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-title">
            Team Activity
            <span className="panel-title-line" />
          </div>
          {activity.length === 0 ? (
            <div className="small" style={{ padding: '16px 0', textAlign: 'center' }}>No activity yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activity.slice(0, 12).map(a => (
                <div key={a.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <Avatar email={a.user_email} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', lineHeight: 1.3 }}>
                      <span style={{ color: 'var(--accent2)' }}>{a.user_email.split('@')[0]}</span>
                      {' '}{a.action}
                      {a.detail && <span style={{ color: 'var(--muted)' }}> · {a.detail}</span>}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: 2 }}>
                      {timeAgo(a.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Inventory overview table */}
      <div className="panel">
        <div className="panel-title">Inventory Overview <span className="panel-title-line" /></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Item</th><th>Unit</th><th>Qty/Unit</th><th>Used</th><th>Remaining</th><th>Reorder At</th><th>Status</th><th>Can Build</th></tr>
            </thead>
            <tbody>
              {derived.map(r => {
                const st = getStatus(r);
                return (
                  <tr key={r.item} className={st !== 'healthy' ? `row-${st}` : ''}>
                    <td><b>{r.item}</b></td>
                    <td className="mono">{r.unit}</td>
                    <td className="mono">{fmt(r.qtyPerUnit)}</td>
                    <td className="mono">{fmt(r.used)}</td>
                    <td className="mono"><b>{fmt(r.remaining)}</b></td>
                    <td className="mono">{fmt(r.reorder)}</td>
                    <td><span className={`badge badge-${st}`}>{st}</span></td>
                    <td className="mono"><b>{fmt(r.possibleUnits)}</b></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottleneck view */}
      <div className="panel">
        <div className="panel-title">Limiting Factors — Bottleneck View <span className="panel-title-line" /></div>
        <div className="small" style={{ marginBottom: 12 }}>Sorted ascending. Lowest = bottleneck.</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Item</th><th>Remaining</th><th>Qty/Unit</th><th>Can Build</th><th>Status</th></tr></thead>
            <tbody>
              {bottlenecks.map((r, i) => {
                const st = getStatus(r);
                return (
                  <tr key={r.item} className={st !== 'healthy' ? `row-${st}` : ''}>
                    <td>
                      <b>{r.item}</b>
                      {i === 0 && <span className="badge badge-critical" style={{ fontSize: 10, marginLeft: 6 }}>bottleneck</span>}
                    </td>
                    <td className="mono">{fmt(r.remaining)} {r.unit}</td>
                    <td className="mono">{fmt(r.qtyPerUnit)} {r.unit}</td>
                    <td className="mono"><b style={{ color: i === 0 ? 'var(--critical)' : 'inherit' }}>{fmt(r.possibleUnits)}</b></td>
                    <td><span className={`badge badge-${st}`}>{st}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
