'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  UserRole,
  MockUserProfile,
  CampaignOption,
  KPIOverviewStats,
  WeeklyKpiTrend,
  CampaignTarget,
  InteractionSort,
  PaginatedInteractions,
  DateRange,
} from '@/lib/types';

export const DEFAULT_MANAGEMENT_USER_ID = 'mgmt-exec';

export interface DashboardFilters {
  campaignId: string;
  channel: string;
  sort: InteractionSort;
  page: number;
  range: DateRange;
  /** Server-side free-text search over interactions. */
  search: string;
  /** ISO week drill-down (e.g. "2026-W30"); narrows the interactions table only. */
  week: string | null;
}

export const DEFAULT_FILTERS: DashboardFilters = {
  campaignId: 'ALL',
  channel: 'ALL',
  sort: 'opened_desc',
  page: 1,
  range: 'all',
  search: '',
  week: null,
};

const EMPTY_INTERACTIONS: PaginatedInteractions = { rows: [], total: 0, page: 1, pageSize: 8 };

export function toSearchParams(f: DashboardFilters): URLSearchParams {
  const params = new URLSearchParams({
    campaignId: f.campaignId,
    channel: f.channel,
    sort: f.sort,
    page: String(f.page),
    range: f.range,
  });
  if (f.search) params.set('search', f.search);
  if (f.week) params.set('week', f.week);
  return params;
}

/**
 * Owns the demo session, the active filter set and the dashboard payload.
 * Any filter change other than `page` resets to page 1.
 */
export function useDashboardData() {
  // Identity — mirrors the verified session returned by /api/session; never
  // the source of truth for access, just what the UI displays.
  const [personas, setPersonas] = useState<MockUserProfile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>(DEFAULT_MANAGEMENT_USER_ID);
  const [role, setRole] = useState<UserRole>('management');

  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  // Latest filters for event handlers, so they never act on a stale render.
  const filtersRef = useRef<DashboardFilters>(DEFAULT_FILTERS);

  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [kpiOverview, setKpiOverview] = useState<KPIOverviewStats | null>(null);
  const [weeklyTrends, setWeeklyTrends] = useState<WeeklyKpiTrend[]>([]);
  const [interactions, setInteractions] = useState<PaginatedInteractions>(EMPTY_INTERACTIONS);
  const [targets, setTargets] = useState<CampaignTarget[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

  // Drops responses from superseded requests (e.g. fast filter changes) so
  // an older, slower response can never overwrite a newer one.
  const requestSeq = useRef(0);

  const fetchData = useCallback(async (f: DashboardFilters) => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard?${toSearchParams(f).toString()}`, { credentials: 'same-origin' });
      if (res.status === 401) throw new Error('Session not established. Please refresh the page.');
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      if (seq !== requestSeq.current) return;

      setCampaigns(data.campaigns || []);
      setKpiOverview(data.kpiOverview || null);
      setWeeklyTrends(data.weeklyTrends || []);
      setInteractions(data.interactions || EMPTY_INTERACTIONS);
      setTargets(data.targets || []);
      setLastFetchedAt(new Date());
    } catch (err: unknown) {
      if (seq !== requestSeq.current) return;
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard metrics');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, []);

  const establishSession = useCallback(
    async (userId: string, f: DashboardFilters) => {
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
        const next = { ...f, page: 1 };
        filtersRef.current = next;
        setFilters(next);
        await fetchData(next);
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
      establishSession(DEFAULT_MANAGEMENT_USER_ID, DEFAULT_FILTERS);
    })();
  }, [establishSession]);

  /** Apply a partial filter change and refetch. Resets to page 1 unless the
   * patch sets `page` itself. */
  const updateFilters = useCallback(
    (patch: Partial<DashboardFilters>) => {
      const next = { ...filtersRef.current, ...patch, page: patch.page ?? 1 };
      filtersRef.current = next;
      setFilters(next);
      fetchData(next);
    },
    [fetchData]
  );

  const switchPersona = useCallback(
    (userId: string) => {
      const persona = personas.find((p) => p.id === userId);
      // A standard persona's campaign is enforced server-side regardless;
      // this only keeps the UI's own filter state consistent with it.
      const campaignId = persona?.role === 'standard' && persona.campaignId ? persona.campaignId : 'ALL';
      establishSession(userId, { ...filtersRef.current, campaignId });
    },
    [personas, establishSession]
  );

  const refresh = useCallback(() => fetchData(filtersRef.current), [fetchData]);

  return {
    personas,
    currentUserId,
    currentPersona: personas.find((p) => p.id === currentUserId),
    role,
    filters,
    updateFilters,
    switchPersona,
    refresh,
    campaigns,
    kpiOverview,
    weeklyTrends,
    interactions,
    targets,
    loading,
    error,
    lastFetchedAt,
  };
}

export type DashboardData = ReturnType<typeof useDashboardData>;
