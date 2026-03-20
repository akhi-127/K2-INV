/**
 * XSS sanitization utilities.
 *
 * OWASP A03: XSS — sanitize all user-supplied content before rendering.
 *
 * Strategy:
 * 1. Zod validation rejects unexpected types at the API boundary.
 * 2. This module escapes strings before inserting into DOM.
 * 3. React's JSX escapes by default — but we have innerHTML in some
 *    legacy JS. All innerHTML insertions go through escapeHtml().
 */

/**
 * Escape a string for safe insertion into HTML context.
 * Use this whenever inserting user data via innerHTML or template literals.
 *
 * Note: In React JSX, {variable} is auto-escaped. This function is only
 * needed for raw DOM manipulation or dangerouslySetInnerHTML.
 */
export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  const s = String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize a string for safe use as a CSS value.
 * Only allows characters valid in CSS property values.
 */
export function safeCss(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[^a-zA-Z0-9\s\-_.(),#%]/g, '');
}

/**
 * Sanitize a filename for download attributes.
 */
export function safeFilename(str: string): string {
  return str.replace(/[^a-zA-Z0-9\-_.]/g, '_');
}

/**
 * Format a number safely for display.
 * Never renders user-supplied format strings.
 */
export function fmt(v: unknown): string {
  const n = Number(v);
  if (isNaN(n)) return '';
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}
