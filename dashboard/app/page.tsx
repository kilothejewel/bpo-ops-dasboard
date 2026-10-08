'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { toSearchParams, useDashboardData } from '@/hooks/useDashboardData';
import { shortWeek } from '@/lib/format';
import Header from '@/components/dashboard/Header';
import FilterStrip from '@/components/dashboard/FilterStrip';
import KpiCards from '@/components/dashboard/KpiCards';
import InsightsPanel from '@/components/dashboard/InsightsPanel';
import DataTables from '@/components/dashboard/DataTables';
import Footer from '@/components/dashboard/Footer';

export default function Dashboard() {
  const d = useDashboardData();
  const { filters, weeklyTrends, campaigns, currentPersona, role, lastFetchedAt } = d;

  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  const syncAgoLabel = useMemo(() => {
    if (!lastFetchedAt) return '—';
    const secs = Math.max(0, Math.round((nowTick - lastFetchedAt.getTime()) / 1000));
    if (secs < 5) return 'just now';
    if (secs < 60) return `${secs}s ago`;
    return `${Math.round(secs / 60)}m ago`;
  }, [lastFetchedAt, nowTick]);

  const weekRangeLabel =
    weeklyTrends.length > 0
      ? `${shortWeek(weeklyTrends[0].week_name)}–${shortWeek(weeklyTrends[weeklyTrends.length - 1].week_name)}`
      : '—';

  const { updateFilters } = d;
  const handleSearchChange = useCallback((search: string) => updateFilters({ search }), [updateFilters]);

  const breadcrumbLabel =
    role === 'management'
      ? filters.campaignId === 'ALL'
        ? 'All Campaigns'
        : campaigns.find((c) => c.campaign_id === filters.campaignId)?.campaign_name || 'Data Marts'
      : currentPersona?.campaignName?.split(' (')[0] || 'Assigned Campaign';

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        breadcrumbLabel={breadcrumbLabel}
        loading={d.loading}
        syncAgoLabel={syncAgoLabel}
        weekRangeLabel={weekRangeLabel}
        personas={d.personas}
        currentUserId={d.currentUserId}
        currentPersona={currentPersona}
        exportHref={`/api/export?${toSearchParams(filters).toString()}`}
        handleRefresh={d.refresh}
        handlePersonaSelect={d.switchPersona}
      />

      <FilterStrip
        role={role}
        loading={d.loading}
        campaigns={campaigns}
        currentPersona={currentPersona}
        kpiOverview={d.kpiOverview}
        meta={d.meta}
        selectedCampaignId={filters.campaignId}
        selectedChannel={filters.channel}
        selectedRange={filters.range}
        handleRangeChange={(range) => d.updateFilters({ range, week: null })}
        handleCampaignChange={(campaignId) => d.updateFilters({ campaignId })}
        handleChannelChange={(channel) => d.updateFilters({ channel })}
      />

      {d.error && (
        <div className="max-w-[1720px] w-full mx-auto px-4 sm:px-6 pt-4">
          <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-red-200 text-xs">{d.error}</div>
        </div>
      )}

      <main className="flex-1 max-w-[1720px] w-full mx-auto p-4 sm:p-6 space-y-6">
        <KpiCards
          kpiOverview={d.kpiOverview}
          weeklyTrends={weeklyTrends}
          weekRangeLabel={weekRangeLabel}
          weekOverWeek={d.weekOverWeek}
        />
        <InsightsPanel
          kpiOverview={d.kpiOverview}
          weeklyTrends={weeklyTrends}
          weekRangeLabel={weekRangeLabel}
          selectedWeek={filters.week}
          onWeekClick={(week) => d.updateFilters({ week: week === filters.week ? null : week })}
        />
        <DataTables
          interactions={d.interactions}
          targets={d.targets}
          page={filters.page}
          sort={filters.sort}
          loading={d.loading}
          search={filters.search}
          week={filters.week}
          handleSearchChange={handleSearchChange}
          handleClearWeek={() => d.updateFilters({ week: null })}
          handleSortChange={(sort) => d.updateFilters({ sort })}
          handlePageChange={(page) => d.updateFilters({ page })}
        />
      </main>

      <Footer meta={d.meta} />
    </div>
  );
}
