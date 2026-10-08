'use client';

import type { TooltipContentProps } from 'recharts';

type ValueType = number | string | (number | string)[];
type NameType = number | string;

interface ChartTooltipProps extends Partial<TooltipContentProps<ValueType, NameType>> {
  formatValue?: (value: number | null) => string;
  /** Optional footer row, e.g. a stacked-bar total. */
  footer?: (payload: Record<string, unknown>) => { label: string; value: string } | null;
}

/** Dark, monospace tooltip matching the panel styling. Values use text ink;
 * the color swatch beside each row carries the series identity. */
export default function ChartTooltip({ active, payload, label, formatValue, footer }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const fmt = formatValue ?? ((v: number | null) => (v === null ? '--' : String(v)));
  const footerRow = footer ? footer(payload[0].payload as Record<string, unknown>) : null;

  return (
    <div className="panel rounded-lg px-3 py-2 text-[11px] font-mono shadow-2xl min-w-[150px]">
      <div className="text-slate-400 mb-1.5">{label}</div>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={String(entry.dataKey)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="text-slate-100 tabular-nums">
              {fmt(typeof entry.value === 'number' ? entry.value : null)}
            </span>
          </div>
        ))}
      </div>
      {footerRow && (
        <div className="flex items-center justify-between gap-4 mt-1.5 pt-1.5 border-t border-slate-800 text-slate-400">
          <span>{footerRow.label}</span>
          <span className="text-slate-100 tabular-nums">{footerRow.value}</span>
        </div>
      )}
    </div>
  );
}
