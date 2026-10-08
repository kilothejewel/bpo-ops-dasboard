// Pure display helpers shared by dashboard components.

export function initials(name: string | undefined): string {
  if (!name) return '··';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function shortWeek(weekName: string): string {
  // "2026-W27" -> "W27"
  const idx = weekName.indexOf('W');
  return idx >= 0 ? weekName.slice(idx) : weekName;
}

export function formatDelay(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '--';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function formatPct(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined) return '--';
  return value.toFixed(digits);
}

/** Compact pagination model: 1, 2, 3 ... current-1 current current+1 ... last */
export function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, 2, 3, total, current - 1, current, current + 1]);
  const filtered = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | '...')[] = [];
  let prev = 0;
  for (const p of filtered) {
    if (prev && p - prev > 1) result.push('...');
    result.push(p);
    prev = p;
  }
  return result;
}

/** Mean of the non-null values; null when there are none (never counts a
 * missing week as 0). */
export function meanOf(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null);
  return present.length ? present.reduce((a, b) => a + b, 0) / present.length : null;
}

export type DeltaMode = 'points' | 'percent' | 'absolute';

export interface Delta {
  /** Signed change: percentage points, relative %, or raw units per `mode`. */
  value: number;
  direction: 'up' | 'down' | 'flat';
  /** null when the metric has no better direction. */
  isGood: boolean | null;
  label: string;
}

/**
 * Change from `previous` to `current`, formatted for a KPI card.
 * `points` = difference of two percentages ("+1.20 pts"), `percent` =
 * relative change ("-5.5%"), `absolute` = raw difference with a unit.
 * Returns null when either side is missing or a relative change would
 * divide by zero.
 */
export function computeDelta(
  current: number | null,
  previous: number | null,
  mode: DeltaMode,
  opts: { higherIsBetter?: boolean; unit?: string; digits?: number } = {}
): Delta | null {
  if (current === null || previous === null) return null;
  const digits = opts.digits ?? (mode === 'percent' ? 1 : 2);
  let value: number;
  if (mode === 'percent') {
    if (previous === 0) return null;
    value = ((current - previous) / previous) * 100;
  } else {
    value = current - previous;
  }
  const rounded = Number(value.toFixed(digits));
  const direction = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat';
  const isGood =
    opts.higherIsBetter === undefined || direction === 'flat'
      ? null
      : (direction === 'up') === opts.higherIsBetter;
  const sign = rounded > 0 ? '+' : '';
  const suffix = mode === 'points' ? ' pts' : mode === 'percent' ? '%' : opts.unit ? ` ${opts.unit}` : '';
  return { value: rounded, direction, isGood, label: `${sign}${rounded.toFixed(digits)}${suffix}` };
}
