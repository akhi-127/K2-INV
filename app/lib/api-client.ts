/**
 * Client-side API helper — shared workspace model.
 * All calls go through our secure API routes.
 */

export interface AppState {
  inventory: InventoryItem[];
  buildLog: BuildLogEntry[];
  receiving: ReceivingEntry[];
  batteryUnits: BatteryUnit[];
}

export interface InventoryItem {
  item: string; unit: 'pcs' | 'mm';
  initial: number; received: number;
  qtyPerUnit: number; reorder: number;
}

export interface BuildLogEntry {
  date: string; unitsBuilt: number; unitId?: string;
}

export interface ReceivingEntry {
  date: string; item: string; qty: number;
  inputQty: number; inputUnit: 'pcs' | 'mm' | 'ft' | 'in';
  po: string; supplier: string; notes: string;
}

export interface BatteryUnit {
  id: string; date: string; ip: string; serial: string;
  status: 'Assembly' | 'In QC' | 'Ready to Ship' | 'Shipped' | 'Returned/Refurbished';
}

export interface ActivityEntry {
  id: number;
  user_email: string;
  action: string;
  detail: string;
  created_at: string;
}

export interface LoadResult {
  state: AppState | null;
  updatedBy: string;
  updatedAt: string;
  activity: ActivityEntry[];
}

export async function loadData(): Promise<LoadResult> {
  const res = await fetch('/api/data', { credentials: 'same-origin' });
  if (res.status === 401) { window.location.href = '/'; return { state: null, updatedBy: '', updatedAt: '', activity: [] }; }
  if (!res.ok) throw new Error('Failed to load data');
  return res.json();
}

export async function saveState(state: AppState, action = 'Updated inventory', detail = ''): Promise<void> {
  const clean: AppState = {
    ...state,
    inventory: state.inventory.map(r => ({
      item: r.item, unit: r.unit, initial: r.initial,
      received: r.received, qtyPerUnit: r.qtyPerUnit, reorder: r.reorder,
    })),
  };
  const res = await fetch('/api/data', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: clean, action, detail }),
  });
  if (res.status === 401) { window.location.href = '/'; return; }
  if (!res.ok) { const { error } = await res.json(); throw new Error(error ?? 'Failed to save'); }
}

export async function signOut(): Promise<void> {
  await fetch('/api/auth/signout', { method: 'POST', credentials: 'same-origin' });
  window.location.href = '/';
}
