'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { AppState, InventoryItem, BatteryUnit, ReceivingEntry, ActivityEntry } from '../lib/api-client';
import { loadData, saveState, signOut } from '../lib/api-client';
import K2Mountain from './K2Mountain';
import Sidebar from './Sidebar';
import Dashboard from './views/Dashboard';
import Inventory from './views/Inventory';
import BatteryUnits from './views/BatteryUnits';
import NewStock from './views/NewStock';
import Toast from './Toast';
import EditItemModal from './EditItemModal';

// ── HELPERS ───────────────────────────────────────────────────
export interface DerivedItem extends InventoryItem {
  unitsBuilt: number; used: number; remaining: number; possibleUnits: number;
}

export const MM_PER_FT = 304.8;
export const MM_PER_IN = 25.4;

export function toMM(value: number, type: string): number {
  if (type === 'ft') return +(value * MM_PER_FT).toFixed(2);
  if (type === 'in') return +(value * MM_PER_IN).toFixed(2);
  return value;
}

export function fmt(v: unknown): string {
  const n = Number(v);
  return isNaN(n) ? '' : Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function getStatus(r: DerivedItem): 'critical' | 'low' | 'healthy' {
  if (r.remaining <= r.reorder) return 'critical';
  if (r.remaining <= r.reorder * 1.5) return 'low';
  return 'healthy';
}

export function computeInventory(state: AppState): DerivedItem[] {
  const built = state.buildLog.reduce((s, r) => s + (r.unitsBuilt || 0), 0);
  return state.inventory.map((row) => {
    const qtyPerUnit = row.qtyPerUnit || 0;
    const used = +(qtyPerUnit * built).toFixed(2);
    const remaining = +((row.initial || 0) + (row.received || 0) - used).toFixed(2);
    const reorder = row.reorder > 0 ? row.reorder : +(qtyPerUnit * 20).toFixed(2);
    const possibleUnits = qtyPerUnit > 0 ? Math.floor(Math.max(remaining, 0) / qtyPerUnit) : 0;
    return { ...row, unitsBuilt: built, used, remaining, reorder, possibleUnits };
  });
}

const EMPTY: AppState = { inventory: [], buildLog: [], receiving: [], batteryUnits: [] };

interface Props {
  userEmail: string;
  initialState: AppState | null;
  initialActivity: ActivityEntry[];
  initialUpdatedBy: string;
  initialUpdatedAt: string;
}

export default function AppShell({ userEmail, initialState, initialActivity, initialUpdatedBy, initialUpdatedAt }: Props) {
  const [state, setState] = useState<AppState>(initialState ?? EMPTY);
  const [activity, setActivity] = useState<ActivityEntry[]>(initialActivity);
  const [lastUpdatedBy, setLastUpdatedBy] = useState(initialUpdatedBy);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(initialUpdatedAt);
  const [view, setView] = useState<'dashboard' | 'inventory' | 'build' | 'receiving'>('dashboard');
  const [syncStatus, setSyncStatus] = useState<'ok' | 'syncing' | 'offline'>('ok');
  const [syncMsg, setSyncMsg] = useState('Live');
  const [toast, setToast] = useState('');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSaveTime = useRef<number>(0);

  const derived = computeInventory(state);

  // ── TOAST ────────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  }, []);

  // ── LIVE POLLING ─────────────────────────────────────────────
  // Poll every 15 seconds to pick up changes from teammates.
  useEffect(() => {
    pollTimer.current = setInterval(async () => {
      // Don't poll if we just saved (avoid overwriting our own pending save)
      if (Date.now() - lastSaveTime.current < 3000) return;
      try {
        const result = await loadData();
        if (result.state) {
          setState(result.state);
          setActivity(result.activity);
          setLastUpdatedBy(result.updatedBy);
          setLastUpdatedAt(result.updatedAt);
        }
      } catch { /* silent — user sees syncStatus */ }
    }, 15000);
    return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
  }, []);

  // ── SAVE ──────────────────────────────────────────────────────
  const save = useCallback((newState: AppState, action = 'Updated inventory', detail = '') => {
    setState(newState);
    setSyncStatus('syncing');
    setSyncMsg('Saving…');
    lastSaveTime.current = Date.now();

    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      try {
        await saveState(newState, action, detail);
        setSyncStatus('ok');
        setSyncMsg('Saved ✓');
        // Refresh activity log after save
        const result = await loadData();
        setActivity(result.activity);
        setLastUpdatedBy(result.updatedBy);
        setLastUpdatedAt(result.updatedAt);
      } catch (e: unknown) {
        setSyncStatus('offline');
        setSyncMsg(e instanceof Error ? e.message : 'Save failed');
      }
    }, 800);
  }, []);

  // ── INVENTORY ─────────────────────────────────────────────────
  function addItem(item: InventoryItem) {
    if (state.inventory.some(x => x.item.toLowerCase() === item.item.toLowerCase())) {
      showToast('Item already exists'); return;
    }
    save({ ...state, inventory: [...state.inventory, item] },
      'Added item', item.item);
    showToast(`${item.item} added ✓`);
  }

  function removeItem(index: number) {
    const item = state.inventory[index];
    if (!confirm(`Remove "${item.item}"?`)) return;
    save({ ...state, inventory: state.inventory.filter((_, i) => i !== index) },
      'Removed item', item.item);
    showToast('Item removed');
  }

  function saveEditItem(index: number, updates: Partial<InventoryItem>) {
    const item = state.inventory[index];
    const inventory = state.inventory.map((r, i) => i === index ? { ...r, ...updates } : r);
    save({ ...state, inventory }, 'Edited item', item.item);
    setEditIndex(null);
    showToast(`${item.item} updated ✓`);
  }

  // ── STOCK ─────────────────────────────────────────────────────
  function addStock(entry: ReceivingEntry) {
    const inventory = state.inventory.map(item =>
      item.item !== entry.item ? item :
      { ...item, received: +(item.received + entry.qty).toFixed(2) }
    );
    save({ ...state, inventory, receiving: [...state.receiving, entry] },
      'Received stock', `+${fmt(entry.qty)} ${entry.item}`);
    showToast(`+${fmt(entry.qty)} added to ${entry.item} ✓`);
  }

  function deleteReceivingEntry(index: number) {
    const entry = state.receiving[index];
    if (!confirm(`Remove +${fmt(entry.qty)} ${entry.item}?\nThis reverses the stock addition.`)) return;
    const inventory = state.inventory.map(item =>
      item.item !== entry.item ? item :
      { ...item, received: Math.max(0, +(item.received - entry.qty).toFixed(2)) }
    );
    save({ ...state, inventory, receiving: state.receiving.filter((_, i) => i !== index) },
      'Removed stock entry', entry.item);
    showToast('Entry removed — stock corrected');
  }

  // ── BATTERY UNITS ─────────────────────────────────────────────
  function saveBatteryUnit(unit: BatteryUnit, isNew: boolean) {
    if (isNew) {
      const builtSoFar = state.buildLog.reduce((s, r) => s + r.unitsBuilt, 0);
      const shortItems = derived.filter(r => r.qtyPerUnit > 0 &&
        r.initial + r.received - r.qtyPerUnit * (builtSoFar + 1) < 0);
      if (shortItems.length && !confirm(`⚠️ These will go negative:\n${shortItems.map(r => r.item).join(', ')}\n\nProceed?`)) return;
      const buildLog = [...state.buildLog, { date: unit.date || new Date().toLocaleDateString(), unitsBuilt: 1, unitId: unit.id }];
      save({ ...state, buildLog, batteryUnits: [...state.batteryUnits, unit] },
        'Built unit', `Unit ${unit.id}`);
      showToast(`Unit ${unit.id} built & saved ✓`);
    } else {
      save({ ...state, batteryUnits: state.batteryUnits.map(u => u.id === unit.id ? unit : u) },
        'Updated unit status', `Unit ${unit.id} → ${unit.status}`);
      showToast(`Unit ${unit.id} → ${unit.status} ✓`);
    }
  }

  function deleteUnit(unitId: string) {
    if (!confirm(`Delete unit ${unitId}?`)) return;
    save({
      ...state,
      batteryUnits: state.batteryUnits.filter(u => u.id !== unitId),
      buildLog: state.buildLog.filter(r => r.unitId !== unitId),
    }, 'Deleted unit', `Unit ${unitId}`);
    showToast(`Unit ${unitId} deleted — inventory restored`);
  }

  function removeBuildLog(index: number) {
    if (!confirm('Remove this build entry? Inventory will recalculate.')) return;
    save({ ...state, buildLog: state.buildLog.filter((_, i) => i !== index) },
      'Removed build log entry');
    showToast('Build entry removed');
  }

  function clearAll() {
    if (!confirm('Clear ALL data? This cannot be undone.')) return;
    save(EMPTY, 'Cleared all data');
    showToast('All data cleared');
  }

  return (
    <div className="app">
      <K2Mountain />
      <Sidebar view={view} setView={setView} userEmail={userEmail}
        syncStatus={syncStatus} syncMsg={syncMsg} onSignOut={signOut} />
      <main className="main">
        {view === 'dashboard' && (
          <Dashboard derived={derived} state={state}
            activity={activity} lastUpdatedBy={lastUpdatedBy} lastUpdatedAt={lastUpdatedAt} />
        )}
        {view === 'inventory' && (
          <Inventory derived={derived} state={state}
            onAddItem={addItem} onRemoveItem={removeItem}
            onEditItem={setEditIndex} onClearAll={clearAll}
            onImport={(s) => { save(s, 'Imported data from Excel'); showToast('Imported ✓'); }} />
        )}
        {view === 'build' && (
          <BatteryUnits state={state} derived={derived}
            onSaveUnit={saveBatteryUnit} onDeleteUnit={deleteUnit}
            onRemoveBuildLog={removeBuildLog} />
        )}
        {view === 'receiving' && (
          <NewStock state={state} onAddStock={addStock} onDeleteEntry={deleteReceivingEntry} />
        )}
      </main>
      {editIndex !== null && (
        <EditItemModal item={state.inventory[editIndex]}
          onSave={(u) => saveEditItem(editIndex, u)} onClose={() => setEditIndex(null)} />
      )}
      <Toast message={toast} />
    </div>
  );
}
