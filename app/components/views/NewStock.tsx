'use client';

import { useState } from 'react';
import type { AppState, ReceivingEntry } from '../../lib/api-client';
import { fmt, toMM } from '../AppShell';

interface Props {
  state: AppState;
  onAddStock: (entry: ReceivingEntry) => void;
  onDeleteEntry: (index: number) => void;
}

const today = new Date().toISOString().slice(0, 10);

export default function NewStock({ state, onAddStock, onDeleteEntry }: Props) {
  const [item, setItem]         = useState('');
  const [qty, setQty]           = useState('');
  const [unit, setUnit]         = useState<'mm' | 'ft' | 'in'>('mm');
  const [date, setDate]         = useState(today);
  const [po, setPo]             = useState('');
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes]       = useState('');

  const selectedItem = state.inventory.find(r => r.item === item);
  const isMM = selectedItem?.unit === 'mm';
  const rawQty = Number(qty) || 0;
  const convertedQty = isMM ? toMM(rawQty, unit) : rawQty;

  function handleAdd() {
    if (!item || !rawQty || rawQty <= 0) { alert('Select item and enter quantity'); return; }
    onAddStock({
      date,
      item,
      qty: convertedQty,
      inputQty: rawQty,
      inputUnit: isMM ? unit : 'pcs',
      po: po.trim(),
      supplier: supplier.trim(),
      notes: notes.trim(),
    });
    setQty(''); setPo(''); setSupplier(''); setNotes('');
  }

  return (
    <>
      <div className="page-header">
        <div className="page-title">New Stock Received</div>
        <div className="page-sub">Log incoming parts with PO number, supplier, and notes</div>
      </div>

      <div className="panel">
        <div className="panel-title">Add Stock Entry <span className="panel-title-line" /></div>

        {/* Row 1 — core fields */}
        <div className="topbar" style={{ marginBottom: 8 }}>
          <div>
            <div className="field-label">Item</div>
            <select value={item} onChange={e => setItem(e.target.value)} style={{ width: 220 }}>
              <option value="">Select item…</option>
              {state.inventory.map(r => (
                <option key={r.item} value={r.item}>{r.item}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="field-label">Amount Received</div>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)}
              placeholder="0" style={{ width: 120 }} />
          </div>
          {isMM && (
            <div>
              <div className="field-label">Unit <span style={{ color: 'var(--ok)', fontSize: 10 }}>↙ auto-converts</span></div>
              <select value={unit} onChange={e => setUnit(e.target.value as 'mm' | 'ft' | 'in')} style={{ width: 110 }}>
                <option value="mm">mm</option>
                <option value="ft">ft (feet)</option>
                <option value="in">in (inches)</option>
              </select>
            </div>
          )}
          <div>
            <div className="field-label">Date</div>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="ok-btn" onClick={handleAdd}>+ Add Stock</button>
          </div>
        </div>

        {/* Conversion hint */}
        {isMM && rawQty > 0 && (
          <div style={{ padding: '7px 11px', background: 'var(--ok-bg)', border: '1px solid rgba(90,170,122,.2)', borderRadius: 7, marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--ok)' }}>
            {unit !== 'mm'
              ? `${rawQty} ${unit} = ${fmt(convertedQty)} mm will be added`
              : `${fmt(rawQty)} mm will be added`}
          </div>
        )}

        {/* Row 2 — PO / supplier / notes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 10, marginBottom: 8 }}>
          <div>
            <div className="field-label">PO / Reference #</div>
            <input value={po} onChange={e => setPo(e.target.value)} placeholder="PO-2024-001" style={{ width: '100%' }} />
          </div>
          <div>
            <div className="field-label">Supplier</div>
            <input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="e.g. CATL, Mouser" style={{ width: '100%' }} />
          </div>
          <div>
            <div className="field-label">Notes</div>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional note" style={{ width: '100%' }} />
          </div>
        </div>

        {selectedItem && (
          <div className="small">
            {selectedItem.unit === 'mm'
              ? <><b style={{ color: 'var(--ok)' }}>{item}</b> stored in <b>mm</b> — enter in mm, ft, or inches.</>
              : <><b style={{ color: 'var(--accent2)' }}>{item}</b> stored in <b>pcs</b> — enter pieces received.</>
            }
          </div>
        )}
      </div>

      {/* Receiving history */}
      <div className="panel">
        <div className="panel-title">Receiving History <span className="panel-title-line" /></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>Item</th><th>Qty Added</th><th>PO #</th><th>Supplier</th><th>Notes</th><th></th></tr>
            </thead>
            <tbody>
              {state.receiving.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>No stock entries yet.</td></tr>
              )}
              {[...state.receiving].reverse().map((r, revI) => {
                const realI = state.receiving.length - 1 - revI;
                const conv = (r.inputUnit && r.inputUnit !== 'mm' && r.inputUnit !== 'pcs')
                  ? ` (${fmt(r.inputQty)} ${r.inputUnit})` : '';
                return (
                  <tr key={revI}>
                    <td className="mono">{r.date}</td>
                    <td>{r.item}</td>
                    <td className="mono">+{fmt(r.qty)}{conv && <span className="small"> {conv}</span>}</td>
                    <td className="mono">{r.po || '—'}</td>
                    <td>{r.supplier || '—'}</td>
                    <td className="small">{r.notes || '—'}</td>
                    <td>
                      <button className="danger" style={{ padding: '3px 9px', fontSize: 11 }}
                        onClick={() => onDeleteEntry(realI)}>✕</button>
                    </td>
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
