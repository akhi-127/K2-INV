'use client';

import { useState } from 'react';
import type { AppState, BatteryUnit } from '../../lib/api-client';
import type { DerivedItem } from '../AppShell';
import { fmt } from '../AppShell';

const UNIT_STATUSES: BatteryUnit['status'][] = ['Assembly', 'In QC', 'Ready to Ship', 'Shipped', 'Returned/Refurbished'];

function statusColor(s: string) {
  if (s === 'Assembly')            return { bg: 'rgba(61,127,255,.15)',  color: '#7ab0ff',  border: 'rgba(61,127,255,.4)' };
  if (s === 'In QC')               return { bg: 'rgba(212,168,67,.12)',  color: '#d4a843',  border: 'rgba(212,168,67,.35)' };
  if (s === 'Ready to Ship')       return { bg: 'rgba(90,170,122,.12)',  color: '#5aaa7a',  border: 'rgba(90,170,122,.35)' };
  if (s === 'Shipped')             return { bg: 'rgba(120,80,220,.15)',  color: '#a080ff',  border: 'rgba(120,80,220,.4)' };
  if (s === 'Returned/Refurbished')return { bg: 'rgba(224,92,75,.12)',   color: '#e05c4b',  border: 'rgba(224,92,75,.35)' };
  return { bg: 'rgba(255,255,255,.06)', color: 'var(--muted)', border: 'var(--line)' };
}

interface Props {
  state: AppState;
  derived: DerivedItem[];
  onSaveUnit: (unit: BatteryUnit, isNew: boolean) => void;
  onDeleteUnit: (id: string) => void;
  onRemoveBuildLog: (index: number) => void;
}

const today = new Date().toISOString().slice(0, 10);

export default function BatteryUnits({ state, derived, onSaveUnit, onDeleteUnit, onRemoveBuildLog }: Props) {
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [unitFilter, setUnitFilter]   = useState<string>('all');
  const [date, setDate]               = useState(today);
  const [unitId, setUnitId]           = useState('');
  const [ip, setIp]                   = useState('');
  const [serial, setSerial]           = useState('');
  const [status, setStatus]           = useState<BatteryUnit['status']>('Assembly');

  const isEditing = selectedId !== null;
  const consumeItems = derived.filter(r => r.qtyPerUnit > 0);

  function handleNew() {
    setSelectedId(null);
    setDate(today); setUnitId(''); setIp(''); setSerial('');
    setStatus('Assembly');
  }

  function handleLoad(unit: BatteryUnit) {
    setSelectedId(unit.id);
    setDate(unit.date || today);
    setUnitId(unit.id);
    setIp(unit.ip || '');
    setSerial(unit.serial || '');
    setStatus(unit.status || 'Assembly');
  }

  function handleSave() {
    if (!unitId.trim()) { alert('Enter a Unit ID'); return; }
    const unit: BatteryUnit = { id: unitId.trim(), date, ip, serial, status };
    const isNew = !state.batteryUnits.find(u => u.id === unit.id);
    onSaveUnit(unit, isNew);
    setSelectedId(unit.id);
  }

  const filtered = unitFilter === 'all'
    ? state.batteryUnits
    : state.batteryUnits.filter(u => (u.status || 'Assembly') === unitFilter);

  return (
    <>
      <div className="page-header">
        <div className="page-title">Battery Units</div>
        <div className="page-sub">Register units — saving a new unit deducts from inventory</div>
      </div>

      {/* Unit form */}
      <div className="panel">
        <div className="panel-title">Unit Details <span className="panel-title-line" /></div>
        <div style={{ border: '1px dashed rgba(200,169,110,.15)', borderRadius: 9, padding: 16, background: 'rgba(200,169,110,.02)', marginBottom: 14 }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <div className="field-label">Date Built</div>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%' }} />
            </div>
            <div>
              <div className="field-label">Unit ID</div>
              <input value={unitId} onChange={e => setUnitId(e.target.value)} placeholder="120"
                style={{ width: '100%' }} disabled={isEditing} />
            </div>
            <div>
              <div className="field-label">IP Address</div>
              <input value={ip} onChange={e => setIp(e.target.value)} placeholder="10.4.100.120" style={{ width: '100%' }} />
            </div>
            <div>
              <div className="field-label">Serial No.</div>
              <input value={serial} onChange={e => setSerial(e.target.value)} placeholder="PACK-2025-00120" style={{ width: '100%' }} />
            </div>
          </div>

          {/* Status pills */}
          <div style={{ marginBottom: 12 }}>
            <div className="field-label">Status</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5 }}>
              {UNIT_STATUSES.map(s => {
                const c = statusColor(s);
                const active = s === status;
                return (
                  <button key={s} className="status-pill-btn"
                    style={active ? { background: c.bg, color: c.color, borderColor: c.border } : {}}
                    onClick={() => setStatus(s)}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Consume preview for new units */}
          {!isEditing && consumeItems.length > 0 && (
            <div style={{ background: 'var(--ok-bg)', border: '1px solid rgba(90,170,122,.2)', borderRadius: 8, padding: '9px 12px', marginBottom: 12, fontSize: 12 }}>
              <span style={{ color: 'var(--ok)', fontWeight: 600 }}>⚡ New unit — </span>
              <span style={{ color: 'var(--muted)' }}>{consumeItems.length} item{consumeItems.length > 1 ? 's' : ''} will be deducted from inventory.</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={handleNew}>+ New Unit</button>
            <button className="ok-btn" onClick={handleSave}>✓ Save Unit</button>
            {isEditing && (
              <button className="danger" onClick={() => { onDeleteUnit(selectedId!); handleNew(); }}>Delete Unit</button>
            )}
            <div className="small">
              {isEditing
                ? `Editing unit ${selectedId} — status updates don't affect inventory`
                : 'Fill in details and click Save. Saving a new unit deducts 1 unit from inventory.'}
            </div>
          </div>
        </div>

        {/* Build history */}
        <div className="panel-title" style={{ marginTop: 2 }}>Build History <span className="panel-title-line" /></div>
        <div className="table-wrap" style={{ maxHeight: 150 }}>
          <table>
            <thead><tr><th>Date</th><th>Unit ID</th><th>Action</th></tr></thead>
            <tbody>
              {state.buildLog.length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--muted)', padding: 14 }}>No units built yet.</td></tr>
              )}
              {[...state.buildLog].reverse().map((r, i) => {
                const realI = state.buildLog.length - 1 - i;
                return (
                  <tr key={i}>
                    <td>{r.date}</td>
                    <td className="mono"><b>Unit {r.unitId || '—'}</b></td>
                    <td>
                      <button className="danger" style={{ padding: '3px 9px', fontSize: 11 }}
                        onClick={() => onRemoveBuildLog(realI)}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unit cards */}
      <div className="panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="panel-title" style={{ marginBottom: 0 }}>
            All Units <span className="panel-title-line" style={{ minWidth: 30 }} />
          </div>
          <span className="small">{filtered.length} of {state.batteryUnits.length} units</span>
        </div>

        {/* Filter bar */}
        <div className="unit-filter-bar">
          {['all', ...UNIT_STATUSES].map(f => (
            <button key={f} className={`uf-btn${unitFilter === f ? ' active' : ''}`}
              onClick={() => setUnitFilter(f)}>
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>

        {/* Cards */}
        <div className="battery-cards">
          {filtered.length === 0 && (
            <div className="small" style={{ gridColumn: '1/-1', padding: 24, textAlign: 'center' }}>
              {state.batteryUnits.length === 0 ? 'No units yet.' : 'No units match this filter.'}
            </div>
          )}
          {filtered.map(unit => {
            const c = statusColor(unit.status || 'Assembly');
            return (
              <div key={unit.id} className={`unit-card${selectedId === unit.id ? ' selected' : ''}`}
                onClick={() => handleLoad(unit)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-.2px' }}>Unit · {unit.id}</div>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--faint)' }}>{unit.date}</span>
                </div>
                <div className="mono small" style={{ marginBottom: 2 }}>{unit.ip || '—'}</div>
                <div className="small" style={{ marginBottom: 10, color: 'var(--faint)' }}>{unit.serial || '—'}</div>

                {/* Inline status pills on card */}
                <div className="status-update">
                  {UNIT_STATUSES.map(s => {
                    const isCur = s === (unit.status || 'Assembly');
                    const sc = statusColor(s);
                    return (
                      <span key={s}
                        className={`status-dot${isCur ? ' cur' : ''}`}
                        style={isCur ? { background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` } : {}}
                        onClick={e => {
                          e.stopPropagation();
                          onSaveUnit({ ...unit, status: s }, false);
                        }}>
                        {s}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
