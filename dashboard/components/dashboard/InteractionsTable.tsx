'use client';

import type { PaginatedInteractions } from '@/lib/types';
import { getPageNumbers } from '@/lib/format';
import type { InteractionColumn } from './interaction-columns';
import { ALIGN_CLASS } from './interaction-columns';

interface InteractionsTableProps {
  interactions: PaginatedInteractions;
  columns: InteractionColumn[];
  page: number;
  loading: boolean;
  handlePageChange: (page: number) => void;
}

export default function InteractionsTable({
  interactions,
  columns,
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
              {columns.map((col) => (
                <th key={col.id} className={`py-2.5 px-4 font-medium ${ALIGN_CLASS[col.align ?? 'left']}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
            {interactions.rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8 px-4 text-center text-slate-500">
                  No interactions match the current filters
                </td>
              </tr>
            ) : (
              interactions.rows.map((row) => (
                <tr key={row.interaction_id} className="hover:bg-slate-800/30 transition group even:bg-white/[0.015]">
                  {columns.map((col) => (
                    <td key={col.id} className={`py-2.5 px-4 ${ALIGN_CLASS[col.align ?? 'left']} ${col.cellClassName ?? ''}`}>
                      {col.render(row)}
                    </td>
                  ))}
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
