'use client';

import { useMemo } from 'react';

import type { KPIOverviewStats, WeekOverWeek, WeeklyKpiTrend } from '@/lib/types';
import { computeDelta, formatPct } from '@/lib/format';
import WowDelta from './WowDelta';
import Sparkline from '@/components/charts/Sparkline';
import { TREND_COLORS } from '@/components/charts/TrendChart';

interface KpiCardsProps {
  kpiOverview: KPIOverviewStats | null;
  weeklyTrends: WeeklyKpiTrend[];
  weekRangeLabel: string;
  weekOverWeek: WeekOverWeek | null;
}

export default function KpiCards({ kpiOverview, weeklyTrends, weekRangeLabel, weekOverWeek }: KpiCardsProps) {
  const slaSeries = useMemo(() => weeklyTrends.map((w) => w.actual_phone_sla_pct), [weeklyTrends]);
  const csatSeries = useMemo(() => weeklyTrends.map((w) => w.actual_csat_pct), [weeklyTrends]);
  const volumeSeries = useMemo(() => weeklyTrends.map((w) => w.total_interactions), [weeklyTrends]);

  const wow = weekOverWeek;
  const wowLine = (delta: ReturnType<typeof computeDelta>) =>
    wow ? (
      <WowDelta
        delta={delta}
        currentWeek={wow.current.week_name}
        previousWeek={wow.previous.week_name}
        skippedPartialWeek={wow.skippedPartialWeek}
      />
    ) : null;
  const slaWow = wow && computeDelta(wow.current.phone_sla_pct, wow.previous.phone_sla_pct, 'points', { higherIsBetter: true });
  const csatWow = wow && computeDelta(wow.current.csat_pct, wow.previous.csat_pct, 'points', { higherIsBetter: true });
  const replyWow =
    wow &&
    computeDelta(wow.current.email_first_reply_mins, wow.previous.email_first_reply_mins, 'absolute', {
      higherIsBetter: false,
      unit: 'min 1st reply',
    });
  // Volume has no "better" direction for an ops team, so it stays neutral.
  const volumeWow = wow && computeDelta(wow.current.total_interactions, wow.previous.total_interactions, 'percent');

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

  return (
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
        {wowLine(slaWow)}
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
        {wowLine(csatWow)}
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
        {wowLine(replyWow)}
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
        {wowLine(volumeWow)}
        <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>Breakdown:</span>
          <span className="text-slate-300">{volumeBreakdown || '—'}</span>
        </div>
      </div>
    </section>
  );
}
