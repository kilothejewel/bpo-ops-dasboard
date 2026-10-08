'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';

import type { AgentLeaderboardRow } from '@/lib/types';
import { formatDelay, formatPct } from '@/lib/format';

/** Below this many observations a percentage is shown muted and flagged,
 * so a 1-of-1 "100%" can't top the board unnoticed. */
export const MIN_SAMPLE = 10;

type SortKey = 'agent_name' | 'interactions' | 'phone_sla_pct' | 'avg_answer_seconds' | 'csat_pct';

const COLUMNS: { key: SortKey; header: string; align: 'left' | 'right'; defaultDir: 'asc' | 'desc' }[] = [
  { key: 'agent_name', header: 'Agent', align: 'left', defaultDir: 'asc' },
  { key: 'interactions', header: 'Interactions', align: 'right', defaultDir: 'desc' },
  { key: 'phone_sla_pct', header: 'Phone SLA %', align: 'right', defaultDir: 'desc' },
  { key: 'avg_answer_seconds', header: 'Avg Answer', align: 'right', defaultDir: 'asc' },
  { key: 'csat_pct', header: 'CSAT Top-Box %', align: 'right', defaultDir: 'desc' },
];

interface AgentLeaderboardProps {
  agents: AgentLeaderboardRow[];
  slaTarget: number | null;
  csatTarget: number | null;
}

function Pct({ value, n, target }: { value: number | null; n: number; target: number | null }) {
  if (value === null) return <span className="text-slate-600">--</span>;
  if (n < MIN_SAMPLE) {
    return (
      <span className="text-slate-500" title={`Only ${n} observations — too few to rank on`}>
        {formatPct(value, 1)} <span className="text-[10px]">(n={n})</span>
      </span>
    );
  }
  const below = target !== null && value < target;
  return (
    <span className={below ? 'text-red-400' : 'text-slate-100'} title={target !== null ? `Target ${target}%` : undefined}>
      {formatPct(value, 1)}
      {below && <span className="sr-only"> (below target)</span>}
      <span className="text-slate-500 text-[10px] ml-1">n={n}</span>
    </span>
  );
}

export default function AgentLeaderboard({ agents, slaTarget, csatTarget }: AgentLeaderboardProps) {
  const [sortKey, setSortKey] = useState<SortKey>('phone_sla_pct');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => {
    const rows = [...agents];
    const sign = dir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (sortKey === 'agent_name') return sign * a.agent_name.localeCompare(b.agent_name);
      // Missing values and small samples always sort last, whichever direction.
      const sampleOf = (r: AgentLeaderboardRow) =>
        sortKey === 'phone_sla_pct' || sortKey === 'avg_answer_seconds'
          ? r.calls_evaluated
          : sortKey === 'csat_pct'
            ? r.csat_responses
            : Infinity;
      const va = sampleOf(a) < MIN_SAMPLE ? null : a[sortKey];
      const vb = sampleOf(b) < MIN_SAMPLE ? null : b[sortKey];
      if (va === null && vb === null) return a.agent_name.localeCompare(b.agent_name);
      if (va === null) return 1;
      if (vb === null) return -1;
      return sign * (va - vb) || a.agent_name.localeCompare(b.agent_name);
    });
    return rows;
  }, [agents, sortKey, dir]);

  const onSort = (key: SortKey) => {
    if (key === sortKey) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setDir(COLUMNS.find((c) => c.key === key)!.defaultDir);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-800 bg-surface-0/60 font-mono text-[11px] text-slate-400 uppercase tracking-wider">
            <th className="py-2.5 px-4 font-medium w-10">#</th>
            {COLUMNS.map((c) => (
              <th
                key={c.key}
                className={`py-2.5 px-4 font-medium ${c.align === 'right' ? 'text-right' : ''}`}
                aria-sort={sortKey === c.key ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                <button
                  onClick={() => onSort(c.key)}
                  className={`inline-flex items-center gap-1 uppercase hover:text-sky-300 transition ${
                    sortKey === c.key ? 'text-sky-300' : ''
                  }`}
                >
                  {c.header}
                  {sortKey === c.key &&
                    (dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS.length + 1} className="py-8 px-4 text-center text-slate-500">
                No agent activity for the current filters
              </td>
            </tr>
          ) : (
            sorted.map((a, i) => (
              <tr key={a.agent_id} className="hover:bg-slate-800/30 transition even:bg-white/[0.015]">
                <td className="py-2.5 px-4 text-slate-500 tabular-nums">{i + 1}</td>
                <td className="py-2.5 px-4">
                  <span className="font-sans text-slate-100 block">{a.agent_name}</span>
                  <span className="text-[10px] text-slate-500">
                    {a.agent_id} · {a.role}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-right tabular-nums">{a.interactions.toLocaleString()}</td>
                <td className="py-2.5 px-4 text-right tabular-nums">
                  <Pct value={a.phone_sla_pct} n={a.calls_evaluated} target={slaTarget} />
                </td>
                <td className="py-2.5 px-4 text-right tabular-nums">{formatDelay(a.avg_answer_seconds)}</td>
                <td className="py-2.5 px-4 text-right tabular-nums">
                  <Pct value={a.csat_pct} n={a.csat_responses} target={csatTarget} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <p className="px-4 py-2.5 border-t border-slate-800/70 text-[11px] text-slate-500 font-mono">
        Values below target in red. Percentages from fewer than {MIN_SAMPLE} observations are muted and ranked last.
      </p>
    </div>
  );
}
