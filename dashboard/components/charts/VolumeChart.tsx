'use client';

import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

import type { WeeklyKpiTrend } from '@/lib/types';
import ChartTooltip from './ChartTooltip';
import { AXIS, CHANNEL_COLORS, SURFACE, TICK_STYLE } from './chart-theme';

// Stack order bottom -> top. The last entry gets the rounded cap.
export const VOLUME_SERIES = [
  { key: 'call_volume', name: 'Phone', color: CHANNEL_COLORS.phone },
  { key: 'email_volume', name: 'Email', color: CHANNEL_COLORS.email },
  { key: 'ticket_volume', name: 'Ticket', color: CHANNEL_COLORS.ticket },
  { key: 'chat_volume', name: 'Chat', color: CHANNEL_COLORS.chat },
] as const;

interface VolumeChartProps {
  data: WeeklyKpiTrend[];
  formatWeek: (weekName: string) => string;
  /** Called with the full ISO week name (e.g. "2026-W30") when a week is clicked. */
  onWeekClick?: (weekName: string) => void;
  selectedWeek?: string | null;
}

/** Weekly interaction volume stacked by channel. Axis scale is derived by
 * Recharts from the data, so it rescales with whatever scope is loaded. */
export default function VolumeChart({ data, formatWeek, onWeekClick, selectedWeek }: VolumeChartProps) {
  const rows = data.map((w) => ({ ...w, week: formatWeek(w.week_name) }));
  const lastIdx = VOLUME_SERIES.length - 1;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={rows}
        margin={{ top: 10, right: 16, bottom: 0, left: -8 }}
        maxBarSize={36}
        onClick={(state) => {
          const idx = Number(state?.activeTooltipIndex);
          if (onWeekClick && Number.isInteger(idx) && data[idx]) onWeekClick(data[idx].week_name);
        }}
        style={onWeekClick ? { cursor: 'pointer' } : undefined}
        // Pointer moves are processed synchronously (not rAF-throttled) so the
        // active week is already resolved when a click/tap lands without a
        // prior hover — e.g. a tap on a touch screen.
        throttledEvents={['scroll', 'wheel', 'touchmove']}
      >
        <CartesianGrid stroke={AXIS.grid} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="week" tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: AXIS.grid }} />
        <YAxis
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          tickFormatter={(v: number) => v.toLocaleString()}
          width={48}
        />
        <Tooltip
          cursor={{ fill: 'rgba(148, 163, 184, 0.06)' }}
          content={
            <ChartTooltip
              formatValue={(v) => (v === null ? '--' : v.toLocaleString())}
              footer={(row) => ({
                label: 'Total',
                value: VOLUME_SERIES.reduce((s, ser) => s + Number(row[ser.key] ?? 0), 0).toLocaleString(),
              })}
            />
          }
        />
        {VOLUME_SERIES.map((ser, i) => (
          <Bar
            key={ser.key}
            dataKey={ser.key}
            name={ser.name}
            stackId="volume"
            fill={ser.color}
            // Surface-colored stroke gives the 2px gap between stacked segments.
            stroke={SURFACE}
            strokeWidth={2}
            radius={i === lastIdx ? [4, 4, 0, 0] : 0}
          >
            {/* Dim the other weeks while one is drilled into. */}
            {rows.map((r) => (
              <Cell key={r.week_name} fillOpacity={selectedWeek && r.week_name !== selectedWeek ? 0.35 : 1} />
            ))}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
