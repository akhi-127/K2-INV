'use client';

import { useState } from 'react';
import type { AppState, InventoryItem } from '../../lib/api-client';
import type { DerivedItem } from '../AppShell';
import { getStatus, fmt, toMM } from '../AppShell';

interface Props {
  derived: DerivedItem[];
  state: AppState;
  onAddItem: (item: InventoryItem) => void;
  onRemoveItem: (index: number) => void;
  onEditItem: (index: number) => void;
  onClearAll: () => void;
  onImport: (state: AppState) => void;
}

type MeasureType = 'pcs' | 'mm' | 'ft' | 'in';
type InvTab = 'items' | 'restock' | 'import';

export default function Inventory({ derived, state, onAddItem, onRemoveItem, onEditItem, onClearAll, onImport }: Props) {
  const [tab, setTab] = useState<InvTab>('items');
  const [name, setName]           = useState('');
  const [measure, setMeasure]     = useState<MeasureType>('pcs');
  const [initial, setInitial]     = useState('');
  const [qtyPerUnit, setQtyPerUnit] = useState('');
  const [reorder, setReorder]     = useState('');
  const [restockUnits, setRestockUnits] = useState('');

  // Conversion hint
  const iv = Number(initial) || 0;
  const qv = Number(qtyPerUnit) || 0;
  const showHint = (measure === 'ft' || measure === 'in') && (iv || qv);

  function handleAddItem() {
    if (!name.trim()) return;
    const unit = measure === 'pcs' ? 'pcs' : 'mm';
    onAddItem({
      item: name.trim(),
      unit,
      initial: toMM(Number(initial) || 0, measure),
      received: 0,
      qtyPerUnit: toMM(Number(qtyPerUnit) || 0, measure),
      reorder: toMM(Number(reorder) || 0, measure),
    });
    setName(''); setInitial(''); setQtyPerUnit(''); setReorder('');
    setMeasure('pcs');
  }

  // Restock planner
  const units = Number(restockUnits) || 0;
  const restockRows = units > 0 ? state.inventory.filter(r => r.qtyPerUnit > 0).map(r => {
    const d = derived.find(x => x.item === r.item);
    const available = d?.remaining ?? 0;
    const required = +(r.qtyPerUnit * units).toFixed(2);
    const short = available < required;
    const orderQty = short ? +(required - available).toFixed(2) : 0;
    return { ...r, available, required, short, orderQty };
  }) : [];
  const shortCount = restockRows.filter(r => r.short).length;

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const sheet = wb.Sheets['Inventory'] || wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[];
      const inventory: InventoryItem[] = rows
        .filter(r => String(r['Item'] || r['item'] || '').trim())
        .map(r => ({
          item: String(r['Item'] || r['item'] || '').trim(),
          unit: (String(r['Unit'] || 'pcs').toLowerCase() === 'mm' ? 'mm' : 'pcs') as 'pcs' | 'mm',
          initial: Number(r['Initial Stock'] || r['initial'] || 0),
          received: Number(r['Parts Received'] || r['received'] || 0),
          qtyPerUnit: Number(r['Qty per Unit'] || r['qtyPerUnit'] || 0),
          reorder: Number(r['Reorder Level'] || r['reorder'] || 0),
        }));
      onImport({ ...state, inventory });
    } catch { alert('Import failed — check file format'); }
    e.target.value = '';
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `k2_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  }

  function exportRestockCSV() {
    const lines = [
      'K2 Inventory — Shopping List',
      `Generated: ${new Date().toLocaleString()}`,
      `Target: ${units} unit(s)`,
      '',
      'Item,Unit,Need,Have,Order Qty,Status',
      ...restockRows.map(r => `"${r.item}",${r.unit},${r.required},${fmt(r.available)},${r.orderQty},${r.short ? 'ORDER' : 'OK'}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `k2_shopping_list_${units}units.csv`;
    a.click();
  }

  return (
    <>
      <div className="page-header">
        <div className="page-title">Inventory</div>
        <div className="page-sub">Manage items, stock levels, restock planning</div>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {(['items', 'restock', 'import'] as InvTab[]).map(t => (
          <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'items' ? 'Items' : t === 'restock' ? 'Restock Planner' : 'Import / Export'}
          </button>
        ))}
      </div>

      {/* ── ITEMS TAB ── */}
      {tab === 'items' && (
        <>
          <div className="panel">
            <div className="panel-title">Add New Item <span className="panel-title-line" /></div>
            <div className="add-item-form">
              <div>
                <div className="field-label">Item Name</div>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. BMS Board" style={{ width: '100%' }}
                  onKeyDown={e => e.key === 'Enter' && handleAddItem()} />
              </div>
              <div>
                <div className="field-label">Measure Type</div>
                <select value={measure} onChange={e => setMeasure(e.target.value as MeasureType)} style={{ width: '100%' }}>
                  <option value="pcs">Pieces (pcs)</option>
                  <option value="mm">Millimetres (mm)</option>
                  <option value="ft">Feet → auto-convert to mm</option>
                  <option value="in">Inches → auto-convert to mm</option>
                </select>
              </div>
              <div>
                <div className="field-label">Initial Stock <span style={{ color: 'var(--accent2)' }}>({measure})</span></div>
                <input type="number" value={initial} onChange={e => setInitial(e.target.value)} placeholder="0" style={{ width: '100%' }} />
              </div>
              <div>
                <div className="field-label">Qty per Battery Unit <span style={{ color: 'var(--accent2)' }}>({measure})</span></div>
                <input type="number" value={qtyPerUnit} onChange={e => setQtyPerUnit(e.target.value)} placeholder="1" style={{ width: '100%' }} />
              </div>
              <div>
                <div className="field-label">Reorder Level</div>
                <input type="number" value={reorder} onChange={e => setReorder(e.target.value)} placeholder="10" style={{ width: '100%' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={handleAddItem} style={{ width: '100%' }}>+ Add Item</button>
              </div>
            </div>
            {showHint && (
              <div style={{ marginTop: 6, padding: '7px 10px', background: 'var(--accent-bg)', borderRadius: 6, fontSize: 12, border: '1px solid rgba(200,169,110,.15)' }}>
                ⟳ Will convert: {iv ? `Initial: ${iv} ${measure} → ${fmt(toMM(iv, measure))} mm` : ''}{iv && qv ? '  ·  ' : ''}{qv ? `Qty/Unit: ${qv} ${measure} → ${fmt(toMM(qv, measure))} mm` : ''}
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-title">All Items <span className="panel-title-line" /></div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Item</th><th>Unit</th><th>Initial</th><th>Received</th><th>Qty/Unit</th><th>Units Built</th><th>Used</th><th>Remaining</th><th>Reorder At</th><th>Can Build</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {derived.length === 0 && (
                    <tr><td colSpan={12} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No items yet. Add your first item above.</td></tr>
                  )}
                  {derived.map((r, i) => {
                    const st = getStatus(r);
                    return (
                      <tr key={r.item} className={st !== 'healthy' ? `row-${st}` : ''}>
                        <td><b>{r.item}</b></td>
                        <td className="mono">{r.unit}</td>
                        <td className="mono">{fmt(r.initial)}</td>
                        <td className="mono">{fmt(r.received)}</td>
                        <td className="mono">{fmt(r.qtyPerUnit)}</td>
                        <td className="mono">{fmt(r.unitsBuilt)}</td>
                        <td className="mono">{fmt(r.used)}</td>
                        <td className="mono"><b>{fmt(r.remaining)}</b></td>
                        <td className="mono">{fmt(r.reorder)}</td>
                        <td className="mono"><b>{fmt(r.possibleUnits)}</b></td>
                        <td><span className={`badge badge-${st}`}>{st}</span></td>
                        <td style={{ display: 'flex', gap: 5 }}>
                          <button className="sec" style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => onEditItem(i)}>Edit</button>
                          <button className="danger" style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => onRemoveItem(i)}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── RESTOCK TAB ── */}
      {tab === 'restock' && (
        <div className="panel">
          <div className="panel-title">Restock Planner <span className="panel-title-line" /></div>
          <div className="small" style={{ marginBottom: 12 }}>Enter target units — see exactly what to order.</div>
          <div className="topbar">
            <input type="number" value={restockUnits} onChange={e => setRestockUnits(e.target.value)}
              placeholder="Units to build…" style={{ width: 180 }} />
            {units > 0 && <button className="sec" onClick={exportRestockCSV}>⬇ Export Shopping List (.csv)</button>}
          </div>

          {units > 0 && (
            <>
              <div style={{
                marginBottom: 12, padding: '10px 14px', borderRadius: 8, fontSize: 13,
                background: shortCount > 0 ? 'var(--critical-bg)' : 'var(--ok-bg)',
                border: `1px solid ${shortCount > 0 ? 'rgba(224,92,75,.2)' : 'rgba(90,170,122,.2)'}`,
              }}>
                {shortCount > 0
                  ? <><b style={{ color: 'var(--critical)' }}>⚠ {shortCount} item{shortCount > 1 ? 's' : ''} need ordering</b> to build {units} unit{units > 1 ? 's' : ''}.</>
                  : <><b style={{ color: 'var(--ok)' }}>✓ All items in stock</b> — you can build {units} unit{units > 1 ? 's' : ''} right now!</>
                }
              </div>

              <div className="restock-result">
                {restockRows.map(r => (
                  <div key={r.item} className={`restock-item ${r.short ? 'short' : 'ok'}`}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{r.item}</div>
                      <div className="small">
                        Need: <span className="mono">{fmt(r.required)} {r.unit}</span>
                        {' · '}Have: <span className="mono">{fmt(r.available)} {r.unit}</span>
                      </div>
                    </div>
                    <div>
                      {r.short
                        ? <span className="badge badge-missing">ORDER {fmt(r.orderQty)} {r.unit}</span>
                        : <span className="badge badge-ok">✓ OK</span>
                      }
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── IMPORT/EXPORT TAB ── */}
      {tab === 'import' && (
        <div className="panel">
          <div className="panel-title">Import / Export <span className="panel-title-line" /></div>
          <div className="small" style={{ marginBottom: 14 }}>
            Excel sheet named <b style={{ color: 'var(--accent2)' }}>Inventory</b> with columns: Item, Unit, Initial Stock, Parts Received, Qty per Unit, Reorder Level
          </div>
          <div className="topbar">
            <input type="file" accept=".xlsx,.xls" onChange={handleImport} />
            <button className="sec" onClick={exportJSON}>Export JSON Backup</button>
            <button className="danger" onClick={onClearAll}>Clear All Data</button>
          </div>
        </div>
      )}
    </>
  );
}
