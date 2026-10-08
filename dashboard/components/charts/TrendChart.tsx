'use client';

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

import type { WeeklyKpiTrend } from '@/lib/types';
import ChartTooltip from './ChartTooltip';
import { AXIS, SERIES, SURFACE, TICK_STYLE } from './chart-theme';

export const TREND_COLORS = { sla: SERIES.blue, csat: SERIES.amber };

interface TrendChartProps {
  data: WeeklyKpiTrend[];
  slaTarget: number | null;
  csatTarget: number | null;
  formatWeek: (weekName: string) => string;
}

/** Weekly Phone SLA % and CSAT % on a shared 0–100% axis. Weeks with no
 * evaluable data stay null and render as a gap rather than a fake 0. */
export default function TrendChart({ data, slaTarget, csatTarget, formatWeek }: TrendChartProps) {
  const rows = data.map((w) => ({
    week: formatWeek(w.week_name),
    sla: w.actual_phone_sla_pct,
    csat: w.actual_csat_pct,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={rows} margin={{ top: 10, right: 16, bottom: 0, left: -8 }}>
        <defs>
          <linearGradient id="slaGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={TREND_COLORS.sla} stopOpacity={0.22} />
            <stop offset="100%" stopColor={TREND_COLORS.sla} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={AXIS.grid} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="week" tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: AXIS.grid }} />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tickFormatter={(v: number) => `${v}%`}
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        {slaTarget !== null && (
          <ReferenceLine y={slaTarget} stroke={TREND_COLORS.sla} strokeDasharray="3 4" strokeOpacity={0.5} />
        )}
        {csatTarget !== null && (
          <ReferenceLine y={csatTarget} stroke={TREND_COLORS.csat} strokeDasharray="3 4" strokeOpacity={0.5} />
        )}
        <Tooltip
          cursor={{ stroke: AXIS.cursor, strokeWidth: 1 }}
          content={<ChartTooltip formatValue={(v) => (v === null ? '--' : `${v.toFixed(2)}%`)} />}
        />
        <Area
          type="monotone"
          dataKey="sla"
          name="Phone SLA"
          stroke={TREND_COLORS.sla}
          strokeWidth={2}
          fill="url(#slaGradient)"
          dot={{ r: 3, fill: SURFACE, stroke: TREND_COLORS.sla, strokeWidth: 2 }}
          activeDot={{ r: 5, fill: TREND_COLORS.sla, stroke: SURFACE, strokeWidth: 2 }}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="csat"
          name="CSAT"
          stroke={TREND_COLORS.csat}
          strokeWidth={2}
          dot={{ r: 3, fill: SURFACE, stroke: TREND_COLORS.csat, strokeWidth: 2 }}
          activeDot={{ r: 5, fill: TREND_COLORS.csat, stroke: SURFACE, strokeWidth: 2 }}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
