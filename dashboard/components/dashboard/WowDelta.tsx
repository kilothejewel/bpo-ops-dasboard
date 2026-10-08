import type { Delta } from '@/lib/format';
import { shortWeek } from '@/lib/format';

interface WowDeltaProps {
  delta: Delta | null;
  currentWeek: string;
  previousWeek: string;
  /** Set when the newest week was skipped for being partial. */
  skippedPartialWeek?: string | null;
}

/** "▲ +1.20 pts W35 vs W34". The arrow and sign carry direction, so
 * good/bad isn't conveyed by color alone. */
export default function WowDelta({ delta, currentWeek, previousWeek, skippedPartialWeek }: WowDeltaProps) {
  const title = skippedPartialWeek
    ? `Latest complete week vs the one before. ${shortWeek(skippedPartialWeek)} is partial (under 7 days of data), so it isn't compared yet.`
    : 'Latest complete week vs the one before';
  const weeks = `${shortWeek(currentWeek)} vs ${shortWeek(previousWeek)}`;
  if (!delta) {
    return <div className="mt-2 text-[11px] font-mono text-slate-500" title={title}>No comparison · {weeks}</div>;
  }
  const arrow = delta.direction === 'up' ? '▲' : delta.direction === 'down' ? '▼' : '■';
  const tone = delta.isGood === null ? 'text-slate-300' : delta.isGood ? 'text-emerald-400' : 'text-red-400';
  return (
    <div className="mt-2 text-[11px] font-mono flex items-center gap-1.5" title={title}>
      <span className={`tabular-nums ${tone}`}>
        <span aria-hidden="true">{arrow}</span> {delta.label}
      </span>
      <span className="text-slate-500">
        {weeks}
        {skippedPartialWeek && <span aria-hidden="true">*</span>}
      </span>
    </div>
  );
}
