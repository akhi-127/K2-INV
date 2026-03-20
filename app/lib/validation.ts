/**
 * Input validation schemas using Zod.
 *
 * All user-supplied data is validated before processing.
 * This prevents injection attacks and ensures type safety.
 *
 * OWASP A03: Injection — parameterized queries + input validation
 * OWASP A04: Insecure Design — validate at the boundary
 */

import { z } from 'zod';

// ── INVENTORY ITEM ─────────────────────────────────────────────
const inventoryItemSchema = z.object({
  // Item name: strip leading/trailing whitespace, limit length.
  // Length limit prevents DoS via huge strings.
  item: z.string().trim().min(1, 'Item name required').max(200, 'Name too long'),
  unit: z.enum(['pcs', 'mm']),
  initial: z.number().min(0).max(1_000_000),
  received: z.number().min(0).max(1_000_000),
  qtyPerUnit: z.number().min(0).max(100_000),
  reorder: z.number().min(0).max(1_000_000),
});

// ── BUILD LOG ENTRY ────────────────────────────────────────────
const buildLogEntrySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  unitsBuilt: z.number().int().min(0).max(10_000),
  unitId: z.string().trim().max(50).optional(),
});

// ── RECEIVING ENTRY ────────────────────────────────────────────
const receivingEntrySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$|^\d{1,2}\/\d{1,2}\/\d{4}$/, 'Invalid date'),
  item: z.string().trim().min(1).max(200),
  qty: z.number().min(0).max(1_000_000),
  inputQty: z.number().min(0).max(1_000_000),
  inputUnit: z.enum(['pcs', 'mm', 'ft', 'in']),
  // PO numbers, supplier names, notes — allow most chars but cap length.
  po: z.string().trim().max(100).optional().default(''),
  supplier: z.string().trim().max(100).optional().default(''),
  notes: z.string().trim().max(500).optional().default(''),
});

// ── BATTERY UNIT ───────────────────────────────────────────────
const batteryUnitSchema = z.object({
  id: z.string().trim().min(1).max(50),
  date: z.string().max(20).optional().default(''),
  ip: z
    .string()
    .trim()
    .max(45) // IPv6 max length
    .regex(/^[0-9a-fA-F.:]*$/, 'Invalid IP format') // Only valid IP chars
    .optional()
    .default(''),
  serial: z.string().trim().max(100).optional().default(''),
  status: z.enum([
    'Assembly',
    'In QC',
    'Ready to Ship',
    'Shipped',
    'Returned/Refurbished',
  ]),
});

// ── FULL STATE ─────────────────────────────────────────────────
export const stateSchema = z.object({
  inventory: z.array(inventoryItemSchema).max(10_000),
  buildLog: z.array(buildLogEntrySchema).max(100_000),
  receiving: z.array(receivingEntrySchema).max(100_000),
  batteryUnits: z.array(batteryUnitSchema).max(100_000),
  // selectedBatteryUnitId is UI-only state — not persisted.
});

export type ValidatedState = z.infer<typeof stateSchema>;

/**
 * Validate and sanitize the state object from the client.
 * Returns { success, data, error }.
 *
 * Never trust the shape of data coming from the client — always validate.
 */
export function validateState(raw: unknown):
  | { success: true; data: ValidatedState }
  | { success: false; error: string } {
  const result = stateSchema.safeParse(raw);
  if (!result.success) {
    // Return a generic error — don't leak schema details to the client.
    const firstError = result.error.errors[0];
    return {
      success: false,
      // Generic path info is safe; we don't include internal details.
      error: `Validation error at ${firstError.path.join('.')}: ${firstError.message}`,
    };
  }
  return { success: true, data: result.data };
}
