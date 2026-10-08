'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Layers,
  RefreshCw,
  Database,
  Search,
  Download,
  Share2,
  TableProperties,
  SlidersHorizontal,
  BarChart3,
  LineChart as LineChartIcon,
  Columns3,
} from 'lucide-react';

import {
  UserRole,
  MockUserProfile,
  CampaignOption,
  KPIOverviewStats,
  WeeklyKpiTrend,
  InteractionRecord,
  CampaignTarget,
  InteractionSort,
  PaginatedInteractions,
} from '@/lib/types';
import TrendChart, { TREND_COLORS } from '@/components/charts/TrendChart';
import VolumeChart, { VOLUME_SERIES } from '@/components/charts/VolumeChart';
import Sparkline from '@/components/charts/Sparkline';

const DEFAULT_MANAGEMENT_USER_ID = 'mgmt-exec';

// ---------------------------------------------------------------------------
// Pure helpers (no component state) — kept outside the component so they're
// trivially testable and don't get recreated on every render.
// ---------------------------------------------------------------------------

function initials(name: string | undefined): string {
  if (!name) return '··';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function shortWeek(weekName: string): string {
  // "2026-W27" -> "W27"
  const idx = weekName.indexOf('W');
  return idx >= 0 ? weekName.slice(idx) : weekName;
}

function formatDelay(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '--';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function formatPct(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined) return '--';
  return value.toFixed(digits);
}

/** Compact pagination model: 1, 2, 3 ... current-1 current current+1 ... last */
function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, 2, 3, total, current - 1, current, current + 1]);
  const filtered = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | '...')[] = [];
  let prev = 0;
  for (const p of filtered) {
    if (prev && p - prev > 1) result.push('...');
    result.push(p);
    prev = p;
  }
  return result;
}

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

const SORT_OPTIONS: { value: InteractionSort; label: string }[] = [
  { value: 'opened_desc', label: 'Opened At (Desc)' },
  { value: 'opened_asc', label: 'Opened At (Asc)' },
  { value: 'delay_asc', label: 'Delay (Asc)' },
  { value: 'delay_desc', label: 'Delay (Desc)' },
  { value: 'csat_desc', label: 'CSAT (Desc)' },
];

// ---------------------------------------------------------------------------

export default function Dashboard() {
  // Identity — mirrors the verified session returned by /api/session; never
  // the source of truth for access, just what the UI displays.
  const [personas, setPersonas] = useState<MockUserProfile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>(DEFAULT_MANAGEMENT_USER_ID);
  const [role, setRole] = useState<UserRole>('management');
  const [personaMenuOpen, setPersonaMenuOpen] = useState(false);
  const personaMenuRef = useRef<HTMLDivElement>(null);

  // Query scope
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('ALL');
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');
  const [sort, setSort] = useState<InteractionSort>('opened_desc');
  const [page, setPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // View state
  const [activeTable, setActiveTable] = useState<'interactions' | 'targets'>('interactions');
  const [chartView, setChartView] = useState<'trends' | 'distribution'>('trends');

  // Data
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [kpiOverview, setKpiOverview] = useState<KPIOverviewStats | null>(null);
  const [weeklyTrends, setWeeklyTrends] = useState<WeeklyKpiTrend[]>([]);
  const [interactions, setInteractions] = useState<PaginatedInteractions>({ rows: [], total: 0, page: 1, pageSize: 8 });
  const [targets, setTargets] = useState<CampaignTarget[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (personaMenuRef.current && !personaMenuRef.current.contains(e.target as Node)) {
        setPersonaMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const fetchData = useCallback(
    async (campaignFilter: string, channel: string, sortValue: InteractionSort, pageValue: number) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          campaignId: campaignFilter,
          channel,
          sort: sortValue,
          page: String(pageValue),
        });
        const res = await fetch(`/api/dashboard?${params.toString()}`, { credentials: 'same-origin' });
        if (res.status === 401) throw new Error('Session not established. Please refresh the page.');
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();

        setCampaigns(data.campaigns || []);
        setKpiOverview(data.kpiOverview || null);
        setWeeklyTrends(data.weeklyTrends || []);
        setInteractions(data.interactions || { rows: [], total: 0, page: 1, pageSize: 8 });
        setTargets(data.targets || []);
        setLastFetchedAt(new Date());
      } catch (err: unknown) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard metrics');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const establishSession = useCallback(
    async (userId: string, campaignFilter: string, channel: string, sortValue: InteractionSort) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ userId }),
        });
        if (!res.ok) throw new Error(`Session could not be established (${res.status})`);
        const data = await res.json();
        if (data.session) {
          setRole(data.session.role);
          setCurrentUserId(data.session.userId || userId);
        }
        setPage(1);
        await fetchData(campaignFilter, channel, sortValue, 1);
      } catch (err: unknown) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to establish session');
        setLoading(false);
      }
    },
    [fetchData]
  );

  const hasBootstrapped = useRef(false);

  useEffect(() => {
    // React Strict Mode intentionally double-invokes effects in dev to
    // surface bugs; without this guard, the initial session-establish call
    // can fire twice concurrently and transiently race itself (visible as a
    // brief 401 in the dev console that self-recovers). This guard makes
    // bootstrap run exactly once regardless of Strict Mode.
    if (hasBootstrapped.current) return;
    hasBootstrapped.current = true;
    (async () => {
      try {
        const res = await fetch('/api/session', { credentials: 'same-origin' });
        if (res.ok) {
          const data = await res.json();
          setPersonas(data.personas || []);
        }
      } catch (err) {
        console.error('Failed to load personas', err);
      }
      establishSession(DEFAULT_MANAGEMENT_USER_ID, 'ALL', 'ALL', 'opened_desc');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const standardPersonas = personas.filter((p) => p.role === 'standard');
  const currentPersona = personas.find((p) => p.id === currentUserId);

  const handlePersonaSelect = (userId: string) => {
    setPersonaMenuOpen(false);
    const persona = personas.find((p) => p.id === userId);
    const campaignFilter = persona?.role === 'standard' ? persona.campaignId || 'CMP-101' : 'ALL';
    setSelectedCampaignId(campaignFilter);
    establishSession(userId, campaignFilter, selectedChannel, sort);
  };

  const handleCampaignChange = (cId: string) => {
    setSelectedCampaignId(cId);
    setPage(1);
    fetchData(cId, selectedChannel, sort, 1);
  };

  const handleChannelChange = (channel: string) => {
    setSelectedChannel(channel);
    setPage(1);
    fetchData(selectedCampaignId, channel, sort, 1);
  };

  const handleSortChange = (newSort: InteractionSort) => {
    setSort(newSort);
    setPage(1);
    fetchData(selectedCampaignId, selectedChannel, newSort, 1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchData(selectedCampaignId, selectedChannel, sort, newPage);
  };

  const handleRefresh = () => {
    fetchData(selectedCampaignId, selectedChannel, sort, page);
  };

  // ---- Derived / computed display data -----------------------------------

  const totalPages = Math.max(1, Math.ceil(interactions.total / interactions.pageSize));
  const rangeStart = interactions.total === 0 ? 0 : (page - 1) * interactions.pageSize + 1;
  const rangeEnd = Math.min(page * interactions.pageSize, interactions.total);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return interactions.rows;
    const q = searchQuery.toLowerCase();
    return interactions.rows.filter((r) =>
      [r.interaction_id, r.campaign_name, r.agent_name, r.channel].some((f) => f.toLowerCase().includes(q))
    );
  }, [interactions.rows, searchQuery]);

  const slaSeries = useMemo(() => weeklyTrends.map((w) => w.actual_phone_sla_pct), [weeklyTrends]);
  const csatSeries = useMemo(() => weeklyTrends.map((w) => w.actual_csat_pct), [weeklyTrends]);
  const volumeSeries = useMemo(() => weeklyTrends.map((w) => w.total_interactions), [weeklyTrends]);

  const phoneDelta =
    kpiOverview && kpiOverview.target_phone_sla_pct !== null
      ? kpiOverview.overall_phone_sla_pct - kpiOverview.target_phone_sla_pct
      : null;

  const volumeBreakdown = useMemo(() => {
    if (!kpiOverview || kpiOverview.total_interactions === 0) return null;
    const t = kpiOverview.total_interactions;
    const pct = (n: number) => Math.round((n / t) * 100);
    return `Calls ${pct(kpiOverview.total_calls)}% · Mail ${pct(kpiOverview.total_emails)}% · Ticket ${pct(kpiOverview.total_tickets)}% · Chat ${pct(kpiOverview.total_chats)}%`;
  }, [kpiOverview]);

  const weekRangeLabel =
    weeklyTrends.length > 0
      ? `${shortWeek(weeklyTrends[0].week_name)}–${shortWeek(weeklyTrends[weeklyTrends.length - 1].week_name)}`
      : '—';

  const syncAgoLabel = useMemo(() => {
    if (!lastFetchedAt) return '—';
    const secs = Math.max(0, Math.round((nowTick - lastFetchedAt.getTime()) / 1000));
    if (secs < 5) return 'just now';
    if (secs < 60) return `${secs}s ago`;
    return `${Math.round(secs / 60)}m ago`;
  }, [lastFetchedAt, nowTick]);

  // Period averages over weeks that actually have a value (null weeks are
  // excluded rather than counted as 0).
  const mean = (vals: (number | null)[]) => {
    const present = vals.filter((v): v is number => v !== null);
    return present.length ? present.reduce((a, b) => a + b, 0) / present.length : null;
  };
  const avgSla = mean(slaSeries);
  const avgCsat = mean(csatSeries);

  const breadcrumbLabel =
    role === 'management'
      ? selectedCampaignId === 'ALL'
        ? 'All Campaigns'
        : campaigns.find((c) => c.campaign_id === selectedCampaignId)?.campaign_name || 'Data Marts'
      : currentPersona?.campaignName?.split(' (')[0] || 'Assigned Campaign';

  return (
    <div className="min-h-screen flex flex-col">
      {/* ============ TOP APP HEADER ============ */}
      <header className="border-b border-slate-800/80 bg-surface-1 sticky top-0 z-40 px-4 sm:px-6 py-2.5">
        <div className="max-w-[1720px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="h-7 w-7 shrink-0 rounded-md bg-surface-0 border border-slate-800 flex items-center justify-center text-sky-400">
              <Layers className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 text-xs min-w-0">
              <span className="font-medium text-slate-400 truncate">Acme Operations</span>
              <span className="text-slate-600 font-mono">/</span>
              <span className="font-medium text-slate-100 truncate">{breadcrumbLabel}</span>
              <span className="hidden sm:inline-flex ml-2 font-mono text-[10px] px-2 py-0.5 rounded-full bg-sky-950/70 border border-sky-800/60 text-sky-300 shrink-0">
                dbt · gold_layer
              </span>
            </div>
            <div className="h-4 w-px bg-slate-800 hidden md:block" />
            <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/40 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>
                {loading ? 'Syncing' : 'Sync idle'} · <span className="text-slate-300">{syncAgoLabel}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden lg:flex items-center bg-surface-0 border border-slate-800/90 rounded-lg p-0.5 text-xs font-mono">
              <button
                disabled
                title="Only the demo dataset's weekly window is available"
                className="px-2.5 py-1 rounded-md text-slate-600 cursor-not-allowed"
              >
                Last 7d
              </button>
              <button className="px-2.5 py-1 rounded-md bg-surface-1 border border-sky-500/60 text-sky-400 font-semibold">
                {weekRangeLabel}
              </button>
              <button
                disabled
                title="Only the demo dataset's weekly window is available"
                className="px-2.5 py-1 rounded-md text-slate-600 cursor-not-allowed"
              >
                YTD
              </button>
            </div>

            <button
              onClick={handleRefresh}
              disabled={loading}
              title="Refresh mart state"
              className="h-7 w-7 rounded-lg border border-slate-800 bg-surface-0 hover:bg-slate-800 text-slate-400 hover:text-sky-400 flex items-center justify-center transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
            </button>

            <div className="hidden sm:flex items-center gap-1.5 border-l border-slate-800 pl-3">
              <button className="h-7 px-2.5 rounded-lg border border-sky-900/60 bg-surface-0 hover:border-sky-500/60 text-xs font-medium flex items-center gap-1.5 transition">
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-slate-200">Export</span>
              </button>
              <button className="h-7 px-2.5 rounded-lg bg-surface-0 border border-sky-500 hover:border-sky-400 text-xs font-semibold flex items-center gap-1.5 transition">
                <Share2 className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-sky-300">Share</span>
              </button>
            </div>

            {/* Persona switcher */}
            <div className="relative pl-1" ref={personaMenuRef}>
              <button
                onClick={() => setPersonaMenuOpen((v) => !v)}
                disabled={loading}
                className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-600 to-sky-400 text-[10px] font-mono font-semibold text-surface-0 flex items-center justify-center ring-1 ring-sky-500/40 disabled:opacity-50"
                title={currentPersona ? `${currentPersona.name} — ${currentPersona.title}` : 'Loading session'}
              >
                {initials(currentPersona?.name)}
              </button>
              {personaMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 panel rounded-lg overflow-hidden shadow-2xl z-50">
                  <div className="px-3 py-2 border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500 font-mono">
                    Switch persona
                  </div>
                  <button
                    onClick={() => handlePersonaSelect(DEFAULT_MANAGEMENT_USER_ID)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-800/60 transition flex items-center justify-between ${
                      currentUserId === DEFAULT_MANAGEMENT_USER_ID ? 'bg-slate-800/40' : ''
                    }`}
                  >
                    <span>
                      <span className="text-slate-100 font-medium block">
                        {personas.find((p) => p.id === DEFAULT_MANAGEMENT_USER_ID)?.name || 'Sarah Chen'}
                      </span>
                      <span className="text-slate-500 text-[11px]">Operations Director · Management</span>
                    </span>
                  </button>
                  <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-slate-500 font-mono border-t border-slate-800/70">
                    Campaign leads (Standard)
                  </div>
                  {standardPersonas.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handlePersonaSelect(p.id)}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-800/60 transition ${
                        currentUserId === p.id ? 'bg-slate-800/40' : ''
                      }`}
                    >
                      <span className="text-slate-100 font-medium block">{p.name}</span>
                      <span className="text-slate-500 text-[11px]">{p.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ============ FILTER & METADATA STRIP ============ */}
      <section className="border-b border-slate-800/60 bg-surface-0/90 px-4 sm:px-6 py-2">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-slate-500 font-mono text-[11px] uppercase tracking-wider">Filters:</span>

            {role === 'management' ? (
              <div className="inline-flex items-center bg-surface-0 border border-slate-800 rounded-md px-2.5 py-1">
                <span className="text-slate-400 mr-1.5">Campaign:</span>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => handleCampaignChange(e.target.value)}
                  disabled={loading}
                  className="bg-transparent border-0 p-0 pr-4 text-slate-200 font-mono text-xs focus:outline-none focus:ring-0 cursor-pointer disabled:opacity-50"
                >
                  <option className="bg-slate-900" value="ALL">
                    Cross-Campaign (All)
                  </option>
                  {campaigns.map((c) => (
                    <option key={c.campaign_id} className="bg-slate-900" value={c.campaign_id}>
                      {c.campaign_id} • {c.campaign_name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="inline-flex items-center bg-surface-0 border border-sky-900/50 rounded-md px-2.5 py-1 text-sky-300">
                <span className="text-slate-500 mr-1.5">Campaign:</span>
                <span className="font-mono">{currentPersona?.campaignName || currentPersona?.campaignId}</span>
              </div>
            )}

            <div className="inline-flex items-center bg-surface-0 border border-slate-800 rounded-md px-2.5 py-1">
              <span className="text-slate-400 mr-1.5">Channel:</span>
              <select
                value={selectedChannel}
                onChange={(e) => handleChannelChange(e.target.value)}
                disabled={loading}
                className="bg-transparent border-0 p-0 pr-4 text-slate-200 font-mono text-xs focus:outline-none focus:ring-0 cursor-pointer disabled:opacity-50"
              >
                <option className="bg-slate-900" value="ALL">All Channels</option>
                <option className="bg-slate-900" value="phone">Phone</option>
                <option className="bg-slate-900" value="email">Email</option>
                <option className="bg-slate-900" value="chat">Chat</option>
                <option className="bg-slate-900" value="ticket">Ticket</option>
              </select>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-0 border border-slate-800/80 text-[11px] text-slate-400 font-mono">
              <span className="text-slate-500">ISO-8601:</span>
              <span className="text-sky-300">Weekly cadence</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-500" />
              Warehouse: <strong className="text-slate-200 font-normal">PostgreSQL marts</strong>
            </span>
            <span className="text-slate-700">·</span>
            <span className="text-slate-400">
              Rows: <span className="text-slate-200 tabular-nums">{(kpiOverview?.total_interactions ?? 0).toLocaleString()}</span>
            </span>
            <span className="text-slate-700">·</span>
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> dbt tests: 48/48 passing
            </span>
          </div>
        </div>
      </section>

      {error && (
        <div className="max-w-[1720px] w-full mx-auto px-4 sm:px-6 pt-4">
          <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-red-200 text-xs">{error}</div>
        </div>
      )}

      {/* ============ MAIN CANVAS ============ */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* ---- KPI CARDS ---- */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Phone SLA */}
          <div className="panel panel-hover rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono text-[11px] tracking-wide uppercase">Phone SLA (&lt;1 min)</span>
                {phoneDelta === null ? (
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800/50 border border-slate-700/50 px-1.5 py-0.5 rounded font-medium">
                    No target set
                  </span>
                ) : (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-medium border ${
                      phoneDelta >= 0
                        ? 'text-emerald-400 bg-emerald-950/50 border-emerald-800/50'
                        : 'text-red-400 bg-red-950/50 border-red-800/50'
                    }`}
                  >
                    {phoneDelta >= 0 ? '+' : ''}
                    {phoneDelta.toFixed(2)}% vs tgt
                  </span>
                )}
              </div>
              <div className="flex items-baseline justify-between mt-2.5">
                <div className="text-3xl font-semibold font-mono tracking-tight text-white tabular-nums">
                  {formatPct(kpiOverview?.overall_phone_sla_pct)}
                  <span className="text-lg text-slate-500 font-sans font-normal">%</span>
                </div>
                <Sparkline values={slaSeries} color={TREND_COLORS.sla} />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>
                Target:{' '}
                <span className="text-slate-200">
                  {kpiOverview?.target_phone_sla_pct !== null && kpiOverview?.target_phone_sla_pct !== undefined
                    ? `${kpiOverview.target_phone_sla_pct.toFixed(1)}%`
                    : 'N/A'}
                </span>
              </span>
              <span>
                Calls: <span className="text-slate-200 tabular-nums">{(kpiOverview?.total_calls_evaluated ?? 0).toLocaleString()}</span>
              </span>
            </div>
          </div>

          {/* CSAT */}
          <div className="panel panel-hover rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono text-[11px] tracking-wide uppercase">CSAT Score (Top-Box)</span>
                <span className="text-[10px] font-mono text-sky-400 bg-sky-950/60 border border-sky-800/60 px-1.5 py-0.5 rounded font-medium">
                  {kpiOverview?.target_csat_pct !== null && kpiOverview?.target_csat_pct !== undefined
                    ? `Baseline: ${kpiOverview.target_csat_pct.toFixed(1)}%`
                    : 'No baseline'}
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-2.5">
                <div className="text-3xl font-semibold font-mono tracking-tight text-white tabular-nums">
                  {formatPct(kpiOverview?.overall_csat_pct)}
                  <span className="text-lg text-slate-500 font-sans font-normal">%</span>
                </div>
                <Sparkline values={csatSeries} color={TREND_COLORS.csat} />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>
                Target:{' '}
                <span className="text-slate-200">
                  {kpiOverview?.target_csat_pct !== null && kpiOverview?.target_csat_pct !== undefined
                    ? `>${kpiOverview.target_csat_pct.toFixed(1)}%`
                    : 'N/A'}
                </span>
              </span>
              <span>
                Responses: <span className="text-slate-200 tabular-nums">{(kpiOverview?.csat_total_responses ?? 0).toLocaleString()}</span>
              </span>
            </div>
          </div>

          {/* Email Response */}
          <div className="panel panel-hover rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono text-[11px] tracking-wide uppercase">Email Response</span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800/50 border border-slate-700/50 px-1.5 py-0.5 rounded font-medium">
                  No Hard SLA
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2.5">
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">1st Reply</span>
                  <span className="text-xl font-semibold font-mono text-emerald-400 tabular-nums">
                    {kpiOverview?.avg_email_first_reply_mins ?? '--'}
                    <span className="text-xs text-slate-500 font-sans ml-0.5">m</span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Resolution</span>
                  <span className="text-xl font-semibold font-mono text-sky-400 tabular-nums">
                    {kpiOverview?.avg_email_resolution_mins ?? '--'}
                    <span className="text-xs text-slate-500 font-sans ml-0.5">m</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Reported as: <span className="text-slate-200">Average</span></span>
              <span>
                Email Vol: <span className="text-slate-200 tabular-nums">{(kpiOverview?.total_emails ?? 0).toLocaleString()}</span>
              </span>
            </div>
          </div>

          {/* Gross Volume */}
          <div className="panel panel-hover rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono text-[11px] tracking-wide uppercase">Gross Interaction Volume</span>
                <span className="text-[10px] font-mono text-sky-300 bg-sky-950/70 border border-sky-800/70 px-1.5 py-0.5 rounded">
                  {weekRangeLabel}
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-2.5">
                <div className="text-3xl font-semibold font-mono tracking-tight text-white tabular-nums">
                  {(kpiOverview?.total_interactions ?? 0).toLocaleString()}
                </div>
                <Sparkline values={volumeSeries} color="#94a3b8" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Breakdown:</span>
              <span className="text-slate-300">{volumeBreakdown || '—'}</span>
            </div>
          </div>
        </section>

        {/* ---- TELEMETRY INSIGHTS ---- */}
        <section className="panel rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/70">
            <div>
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <span>Telemetry Insights</span>
                <span className="font-mono text-[11px] text-sky-400 font-normal">· Silver to Gold Transformations</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculated aggregates across {weeklyTrends.length}-week operational window
              </p>
            </div>
            <div className="bg-surface-0 border border-slate-800 rounded-lg p-0.5 flex text-xs font-mono">
              <button
                onClick={() => setChartView('trends')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition ${
                  chartView === 'trends'
                    ? 'bg-surface-1 border border-sky-500/70 text-sky-400 font-semibold'
                    : 'border border-transparent text-slate-400 hover:text-sky-300'
                }`}
              >
                <LineChartIcon className="w-3.5 h-3.5" />
                Trends &amp; Performance
              </button>
              <button
                onClick={() => setChartView('distribution')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition ${
                  chartView === 'distribution'
                    ? 'bg-surface-1 border border-sky-500/70 text-sky-400 font-semibold'
                    : 'border border-transparent text-slate-400 hover:text-sky-300'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Channel Distribution
              </button>
            </div>
          </div>

          {chartView === 'trends' ? (
            <div className="pt-4">
              <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 mb-2 font-mono gap-2">
                <div className="flex flex-wrap items-center gap-5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-0.5 inline-block rounded-full" style={{ backgroundColor: TREND_COLORS.sla }} />
                    <span className="text-slate-200 font-medium">Phone SLA %</span>
                    <span className="text-slate-500">avg {formatPct(avgSla, 1)}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-0.5 inline-block rounded-full" style={{ backgroundColor: TREND_COLORS.csat }} />
                    <span className="text-slate-200 font-medium">CSAT Score %</span>
                    <span className="text-slate-500">avg {formatPct(avgCsat, 1)}%</span>
                  </div>
                  {kpiOverview?.target_phone_sla_pct != null && (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <span className="w-3 border-b border-dashed inline-block" style={{ borderColor: TREND_COLORS.sla }} />
                      <span>SLA Target: {kpiOverview.target_phone_sla_pct.toFixed(0)}%</span>
                    </div>
                  )}
                  {kpiOverview?.target_csat_pct != null && (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <span className="w-3 border-b border-dashed inline-block" style={{ borderColor: TREND_COLORS.csat }} />
                      <span>CSAT Baseline: {kpiOverview.target_csat_pct.toFixed(0)}%</span>
                    </div>
                  )}
                </div>
                <span className="text-slate-500">{weekRangeLabel} · hover for weekly values</span>
              </div>

              <div className="relative w-full h-[260px]">
                {weeklyTrends.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">No trend data available</div>
                ) : (
                  <TrendChart
                    data={weeklyTrends}
                    slaTarget={kpiOverview?.target_phone_sla_pct ?? null}
                    csatTarget={kpiOverview?.target_csat_pct ?? null}
                    formatWeek={shortWeek}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="pt-4">
              <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 mb-2 font-mono gap-2">
                <div className="flex flex-wrap items-center gap-5">
                  {VOLUME_SERIES.map((ser) => (
                    <div key={ser.key} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: ser.color }} />
                      <span className="text-slate-300">{ser.name}</span>
                    </div>
                  ))}
                </div>
                <span className="text-slate-500">Volume per ISO-Week</span>
              </div>

              <div className="relative w-full h-[260px]">
                {weeklyTrends.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">No volume data available</div>
                ) : (
                  <VolumeChart data={weeklyTrends} formatWeek={shortWeek} />
                )}
              </div>
            </div>
          )}
        </section>

        {/* ---- DATA MART TABLES ---- */}
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
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 px-4 text-center text-slate-500">
                          No interactions match the current filters
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row: InteractionRecord) => (
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
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-surface-0/60 font-mono text-[11px] text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-4 font-medium">Campaign ID</th>
                    <th className="py-2.5 px-4 font-medium">Metric Specification</th>
                    <th className="py-2.5 px-4 font-medium text-right">Target</th>
                    <th className="py-2.5 px-4 font-medium">Unit</th>
                    <th className="py-2.5 px-4 font-medium text-right">Live Actual</th>
                    <th className="py-2.5 px-4 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                  {targets.map((t, idx) => (
                    <tr key={`${t.campaign_id}-${t.metric_name}-${idx}`} className="hover:bg-slate-800/30 transition">
                      <td className="py-2 px-4 text-slate-100 font-medium">{t.campaign_id}</td>
                      <td className="py-2 px-4 text-slate-300">{t.metric_name}</td>
                      <td className="py-2 px-4 text-right tabular-nums text-white">{t.target_value}</td>
                      <td className="py-2 px-4 text-slate-500">{t.unit}</td>
                      <td className="py-2 px-4 text-right tabular-nums">
                        {t.actual_value !== null ? (
                          <span className={t.is_met ? 'text-emerald-400' : 'text-red-400'}>{t.actual_value}</span>
                        ) : (
                          <span className="text-slate-600">--</span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-center">
                        {t.is_met === null ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-slate-800/50 text-slate-400 border border-slate-700/50">
                            No data
                          </span>
                        ) : t.is_met ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-emerald-950/50 text-emerald-300 border border-emerald-800/50">
                            Healthy
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-red-950/50 text-red-300 border border-red-800/50">
                            Below Target
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-slate-800/70 bg-surface-0 mt-auto px-4 sm:px-6 py-3 text-xs text-slate-500">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-mono text-[11px] flex-wrap">
            <span className="text-slate-400 uppercase tracking-wider text-[10px]">Medallion Lineage:</span>
            <div className="flex items-center gap-1.5 bg-surface-1 border border-slate-800 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span className="text-slate-300">Bronze Ingest</span>
            </div>
            <span className="text-slate-600">→</span>
            <div className="flex items-center gap-1.5 bg-surface-1 border border-slate-800 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span className="text-slate-300">Silver Cleanse</span>
            </div>
            <span className="text-slate-600">→</span>
            <div className="flex items-center gap-1.5 bg-surface-1 border border-slate-800 px-2 py-0.5 rounded ring-1 ring-emerald-500/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-slate-100 font-medium">Gold Marts</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500">
            <span>
              Target: <strong className="text-slate-300 font-normal">local · postgres</strong>
            </span>
            <span>
              Runtime: <strong className="text-slate-300 font-normal">Next.js 16.3.4</strong>
            </span>
            <span>
              dbt: <strong className="text-slate-300 font-normal">1.12.3</strong>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
