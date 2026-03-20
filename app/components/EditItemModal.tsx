'use client';

import { useState } from 'react';
import type { InventoryItem } from '../lib/api-client';

interface Props {
  item: InventoryItem;
  onSave: (updates: Partial<InventoryItem>) => void;
  onClose: () => void;
}

export default function EditItemModal({ item, onSave, onClose }: Props) {
  const [initial, setInitial]       = useState(String(item.initial));
  const [qtyPerUnit, setQtyPerUnit] = useState(String(item.qtyPerUnit));
  const [reorder, setReorder]       = useState(String(item.reorder));

  function handleSave() {
    onSave({
      initial:    Math.max(0, Number(initial)    || 0),
      qtyPerUnit: Math.max(0, Number(qtyPerUnit) || 0),
      reorder:    Math.max(0, Number(reorder)    || 0),
    });
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-title">
        <div className="modal-title" id="edit-title">
          Edit Item — <span style={{ color: 'var(--accent2)' }}>{item.item}</span>
        </div>
        <div className="modal-grid">
          <div>
            <div className="field-label">Initial Stock</div>
            <input type="number" value={initial} onChange={(e) => setInitial(e.target.value)} style={{ width: '100%' }} min="0" />
          </div>
          <div>
            <div className="field-label">Qty per Battery Unit</div>
            <input type="number" value={qtyPerUnit} onChange={(e) => setQtyPerUnit(e.target.value)} style={{ width: '100%' }} min="0" />
          </div>
          <div>
            <div className="field-label">Reorder Level</div>
            <input type="number" value={reorder} onChange={(e) => setReorder(e.target.value)} style={{ width: '100%' }} min="0" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 4 }}>
            <div className="field-label">Unit: <span style={{ color: 'var(--accent2)' }}>{item.unit}</span></div>
            <div className="small">Changes take effect immediately.</div>
          </div>
        </div>
        <div className="modal-actions">
          <button className="sec" onClick={onClose}>Cancel</button>
          <button className="ok-btn" onClick={handleSave}>✓ Save Changes</button>
        </div>
      </div>
    </div>
  );
}
