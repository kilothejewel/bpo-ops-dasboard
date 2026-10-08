'use client';

import { useMemo, useState } from 'react';
import { Search, TableProperties, SlidersHorizontal, Columns3 } from 'lucide-react';

import type { CampaignTarget, InteractionSort, PaginatedInteractions } from '@/lib/types';
import InteractionsTable from './InteractionsTable';
import TargetsTable from './TargetsTable';

const SORT_OPTIONS: { value: InteractionSort; label: string }[] = [
  { value: 'opened_desc', label: 'Opened At (Desc)' },
  { value: 'opened_asc', label: 'Opened At (Asc)' },
  { value: 'delay_asc', label: 'Delay (Asc)' },
  { value: 'delay_desc', label: 'Delay (Desc)' },
  { value: 'csat_desc', label: 'CSAT (Desc)' },
];

interface DataTablesProps {
  interactions: PaginatedInteractions;
  targets: CampaignTarget[];
  page: number;
  sort: InteractionSort;
  loading: boolean;
  handleSortChange: (sort: InteractionSort) => void;
  handlePageChange: (page: number) => void;
}

export default function DataTables({
  interactions,
  targets,
  page,
  sort,
  loading,
  handleSortChange,
  handlePageChange,
}: DataTablesProps) {
  const [activeTable, setActiveTable] = useState<'interactions' | 'targets'>('interactions');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return interactions.rows;
    const q = searchQuery.toLowerCase();
    return interactions.rows.filter((r) =>
      [r.interaction_id, r.campaign_name, r.agent_name, r.channel].some((f) => f.toLowerCase().includes(q))
    );
  }, [interactions.rows, searchQuery]);

  return (
    <section className="panel rounded-xl overflow-hidden">
      <div className="p-3.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-surface-0/60">
        <div className="flex items-center gap-1.5 p-1 bg-surface-0 border border-slate-800 rounded-lg">
          <button
            onClick={() => setActiveTable('interactions')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition ${
              activeTable === 'interactions'
                ? 'bg-surface-1 border border-sky-500/70 text-sky-400'
                : 'border border-transparent text-slate-400 hover:text-sky-300'
            }`}
          >
            <TableProperties className="w-3.5 h-3.5" />
            fct_interactions
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-0 border border-sky-700/60 text-sky-300">
              {interactions.total.toLocaleString()}
            </span>
          </button>
          <button
            onClick={() => setActiveTable('targets')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition ${
              activeTable === 'targets'
                ? 'bg-surface-1 border border-sky-500/70 text-sky-400'
                : 'border border-transparent text-slate-400 hover:text-sky-300'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            campaign_targets
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-0 text-slate-400 border border-slate-800">
              {targets.length}
            </span>
          </button>
        </div>

        {activeTable === 'interactions' && (
          <div className="flex items-center gap-2.5">
            <div className="relative w-56 sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter loaded rows…"
                className="w-full bg-surface-0 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
            <div className="hidden sm:flex items-center bg-surface-0 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
              <span className="text-slate-500 mr-1.5 text-[11px]">Sort:</span>
              <select
                value={sort}
                onChange={(e) => handleSortChange(e.target.value as InteractionSort)}
                disabled={loading}
                className="bg-transparent border-0 p-0 text-slate-300 font-mono text-xs focus:outline-none focus:ring-0 cursor-pointer disabled:opacity-50"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-slate-900">
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="h-8 px-2.5 rounded-lg border border-slate-800 bg-surface-0 text-slate-400 text-xs font-mono flex items-center gap-1.5"
              title="Column visibility (coming soon)"
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Columns</span>
            </button>
          </div>
        )}
      </div>

      {activeTable === 'interactions' ? (
        <InteractionsTable
          interactions={interactions}
          filteredRows={filteredRows}
          page={page}
          loading={loading}
          handlePageChange={handlePageChange}
        />
      ) : (
        <TargetsTable targets={targets} />
      )}
    </section>
  );
}
