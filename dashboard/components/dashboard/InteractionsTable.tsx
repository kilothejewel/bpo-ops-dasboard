'use client';

import type { InteractionRecord, PaginatedInteractions } from '@/lib/types';
import { formatDelay, getPageNumbers } from '@/lib/format';

const CHANNEL_STYLES: Record<string, string> = {
  phone: 'bg-sky-950/90 text-sky-300 border-sky-800/60',
  email: 'bg-sky-950/70 text-sky-300 border-sky-800/50',
  chat: 'bg-slate-900 text-slate-300 border-slate-700/60',
  ticket: 'bg-slate-900 text-slate-300 border-slate-700/60',
};

function csatChipClasses(score: number): string {
  if (score >= 4) return 'text-emerald-400 bg-emerald-950/50 border-emerald-800/40';
  if (score === 3) return 'text-slate-300 bg-slate-800/80 border-slate-700/60';
  return 'text-red-400 bg-red-950/50 border-red-800/50';
}

interface InteractionsTableProps {
  interactions: PaginatedInteractions;
  page: number;
  loading: boolean;
  handlePageChange: (page: number) => void;
}

export default function InteractionsTable({
  interactions,
  page,
  loading,
  handlePageChange,
}: InteractionsTableProps) {
  const totalPages = Math.max(1, Math.ceil(interactions.total / interactions.pageSize));
  const rangeStart = interactions.total === 0 ? 0 : (page - 1) * interactions.pageSize + 1;
  const rangeEnd = Math.min(page * interactions.pageSize, interactions.total);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-surface-0/60 font-mono text-[11px] text-slate-400 uppercase tracking-wider">
              <th className="py-2.5 px-4 font-medium">Interaction ID</th>
              <th className="py-2.5 px-4 font-medium">Campaign</th>
              <th className="py-2.5 px-4 font-medium">Assigned Agent</th>
              <th className="py-2.5 px-4 font-medium">Channel</th>
              <th className="py-2.5 px-4 font-medium">Opened At (UTC)</th>
              <th className="py-2.5 px-4 font-medium text-right">Answer Delay</th>
              <th className="py-2.5 px-4 font-medium text-center">CSAT</th>
              <th className="py-2.5 px-4 font-medium text-right">SLA Metric</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
            {interactions.rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 px-4 text-center text-slate-500">
                  No interactions match the current filters
                </td>
              </tr>
            ) : (
              interactions.rows.map((row: InteractionRecord) => (
                <tr key={row.interaction_id} className="hover:bg-slate-800/30 transition group even:bg-white/[0.015]">
                  <td className="py-2.5 px-4 text-slate-100 font-medium group-hover:text-sky-400 transition">{row.interaction_id}</td>
                  <td className="py-2.5 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-sky-950/60 text-sky-300 border border-sky-800/60">
                      {row.campaign_name}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-sans text-slate-300">{row.agent_name}</td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase border ${
                        CHANNEL_STYLES[row.channel] || CHANNEL_STYLES.chat
                      }`}
                    >
                      {row.channel}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 text-[11px]">{row.opened_at}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-slate-300">{formatDelay(row.answer_time_seconds)}</td>
                  <td className="py-2.5 px-4 text-center">
                    {row.csat_score !== null ? (
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded font-medium border ${csatChipClasses(row.csat_score)}`}>
                        {row.csat_score} / 5
                      </span>
                    ) : (
                      <span className="text-slate-600">--</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {row.is_call_answered_under_1min === 1 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950/50 text-emerald-300 border border-emerald-800/50">
                        Met (&lt;1m)
                      </span>
                    ) : row.is_call_answered_under_1min === 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-950/50 text-red-400 border border-red-800/50">
                        Missed (&gt;1m)
                      </span>
                    ) : (
                      <span className="text-slate-600 text-[11px]">--</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-slate-800/70 bg-surface-0/60 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="text-slate-500 font-mono">
          Row buffer: <strong className="text-slate-300 font-normal">{rangeStart} - {rangeEnd}</strong> of{' '}
          <strong className="text-slate-300 font-normal">{interactions.total.toLocaleString()}</strong>
        </span>
        <div className="flex items-center gap-1 font-mono">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || loading}
            className="px-2 py-1 rounded bg-surface-0 border border-slate-800/80 text-slate-400 hover:text-sky-400 disabled:text-slate-600 disabled:cursor-not-allowed transition"
          >
            Prev
          </button>
          {getPageNumbers(page, totalPages).map((p, i) =>
            p === '...' ? (
              <span key={`e${i}`} className="px-1 text-slate-700">
                ...
              </span>
            ) : (
              <button
                key={p}
                onClick={() => handlePageChange(p)}
                disabled={loading}
                className={`px-2.5 py-1 rounded border transition ${
                  p === page
                    ? 'bg-surface-0 border-sky-500 text-sky-300 font-semibold'
                    : 'bg-surface-0 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-sky-400'
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages || loading}
            className="px-2.5 py-1 rounded bg-surface-0 hover:bg-slate-800 border border-sky-900/50 hover:border-sky-500/50 text-sky-400 disabled:text-slate-600 disabled:border-slate-800 disabled:cursor-not-allowed transition"
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}
