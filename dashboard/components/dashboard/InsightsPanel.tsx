'use client';

import { useState } from 'react';
import { BarChart3, LineChart as LineChartIcon } from 'lucide-react';

import type { KPIOverviewStats, WeeklyKpiTrend } from '@/lib/types';
import { formatPct, meanOf, shortWeek } from '@/lib/format';
import TrendChart, { TREND_COLORS } from '@/components/charts/TrendChart';
import VolumeChart, { VOLUME_SERIES } from '@/components/charts/VolumeChart';

interface InsightsPanelProps {
  kpiOverview: KPIOverviewStats | null;
  weeklyTrends: WeeklyKpiTrend[];
  weekRangeLabel: string;
}

export default function InsightsPanel({ kpiOverview, weeklyTrends, weekRangeLabel }: InsightsPanelProps) {
  const [chartView, setChartView] = useState<'trends' | 'distribution'>('trends');
  // Period averages over weeks that actually have a value (null weeks are
  // excluded rather than counted as 0).
  const avgSla = meanOf(weeklyTrends.map((w) => w.actual_phone_sla_pct));
  const avgCsat = meanOf(weeklyTrends.map((w) => w.actual_csat_pct));

  return (
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
  );
}
