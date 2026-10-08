'use client';

import { useEffect, useState } from 'react';
import { Search, TableProperties, SlidersHorizontal, Trophy, X } from 'lucide-react';

import type { AgentLeaderboardRow, CampaignTarget, InteractionSort, PaginatedInteractions } from '@/lib/types';
import { shortWeek } from '@/lib/format';
import InteractionsTable from './InteractionsTable';
import TargetsTable from './TargetsTable';
import AgentLeaderboard from './AgentLeaderboard';
import ColumnMenu from './ColumnMenu';
import { INTERACTION_COLUMNS } from './interaction-columns';
import { useHiddenColumns } from '@/hooks/useHiddenColumns';

const SEARCH_DEBOUNCE_MS = 300;

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
  agents: AgentLeaderboardRow[];
  slaTarget: number | null;
  csatTarget: number | null;
  page: number;
  sort: InteractionSort;
  loading: boolean;
  search: string;
  week: string | null;
  handleSortChange: (sort: InteractionSort) => void;
  handlePageChange: (page: number) => void;
  handleSearchChange: (search: string) => void;
  handleClearWeek: () => void;
}

export default function DataTables({
  interactions,
  targets,
  agents,
  slaTarget,
  csatTarget,
  page,
  sort,
  loading,
  search,
  week,
  handleSortChange,
  handlePageChange,
  handleSearchChange,
  handleClearWeek,
}: DataTablesProps) {
  const [activeTable, setActiveTable] = useState<'interactions' | 'agents' | 'targets'>('interactions');
  const { hidden, toggle } = useHiddenColumns();
  const visibleColumns = INTERACTION_COLUMNS.filter((c) => c.required || !hidden.includes(c.id));

  // Local draft so typing stays responsive; the server query fires once
  // the user pauses. Re-syncs if the filter changes from outside (e.g. URL).
  const [searchDraft, setSearchDraft] = useState(search);
  const [syncedSearch, setSyncedSearch] = useState(search);
  if (search !== syncedSearch) {
    setSyncedSearch(search);
    setSearchDraft(search);
  }

  useEffect(() => {
    if (searchDraft.trim() === search) return;
    const id = setTimeout(() => handleSearchChange(searchDraft.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [searchDraft, search, handleSearchChange]);

  return (
    <section className="panel rounded-xl overflow-hidden">
      <div className="p-3.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-surface-0/60">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-surface-0 border border-slate-800 rounded-lg">
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
            onClick={() => setActiveTable('agents')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition ${
              activeTable === 'agents'
                ? 'bg-surface-1 border border-sky-500/70 text-sky-400'
                : 'border border-transparent text-slate-400 hover:text-sky-300'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            agent_leaderboard
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-0 text-slate-400 border border-slate-800">
              {agents.length}
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
          <div className="flex flex-wrap items-center gap-2.5">
            {week && (
              <button
                onClick={handleClearWeek}
                title="Clear week drill-down"
                className="h-8 px-2.5 rounded-lg border border-sky-700/70 bg-sky-950/50 text-sky-300 text-xs font-mono flex items-center gap-1.5 hover:border-sky-500 transition"
              >
                Week {shortWeek(week)}
                <X className="w-3 h-3" />
              </button>
            )}
            <div className="relative w-56 sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
              <input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="Search ID, agent, campaign…"
                aria-label="Search all interactions"
                maxLength={64}
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
            <ColumnMenu columns={INTERACTION_COLUMNS} hidden={hidden} onToggle={toggle} />
          </div>
        )}
      </div>

      {activeTable === 'interactions' ? (
        <InteractionsTable
          interactions={interactions}
          columns={visibleColumns}
          page={page}
          loading={loading}
          handlePageChange={handlePageChange}
        />
      ) : activeTable === 'agents' ? (
        <AgentLeaderboard agents={agents} slaTarget={slaTarget} csatTarget={csatTarget} />
      ) : (
        <TargetsTable targets={targets} />
      )}
    </section>
  );
}
