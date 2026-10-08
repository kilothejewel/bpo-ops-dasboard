/**
 * Minimal RFC 4180 CSV writer.
 *
 * String cells that a spreadsheet would treat as a formula (leading = + - @
 * tab or CR) are prefixed with a single quote, so a value like
 * `=HYPERLINK(...)` in an exported row can't execute when the file is opened
 * in Excel/Sheets (CSV / formula injection).
 */

const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = typeof value === 'string' ? value : String(value);
  if (typeof value === 'string' && FORMULA_TRIGGER.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv<T extends object>(rows: T[], columns: { key: keyof T; header: string }[]): string {
  const lines = [columns.map((c) => csvCell(c.header)).join(',')];
  for (const row of rows) lines.push(columns.map((c) => csvCell(row[c.key])).join(','));
  return lines.join('\r\n') + '\r\n';
}
