'use client';

import { LineChart, Line, YAxis } from 'recharts';

interface SparklineProps {
  values: (number | null)[];
  color: string;
  width?: number;
  height?: number;
}

/** Axis-less trend glyph for KPI cards. Scales to the series' own min/max
 * so small week-over-week movement stays visible. */
export default function Sparkline({ values, color, width = 64, height = 28 }: SparklineProps) {
  const data = values.map((v, i) => ({ i, v }));
  return (
    <LineChart width={width} height={height} data={data} margin={{ top: 3, right: 2, bottom: 3, left: 2 }}>
      <YAxis hide domain={['dataMin', 'dataMax']} />
      <Line
        type="monotone"
        dataKey="v"
        stroke={color}
        strokeWidth={1.75}
        dot={false}
        connectNulls={false}
        isAnimationActive={false}
      />
    </LineChart>
  );
}
