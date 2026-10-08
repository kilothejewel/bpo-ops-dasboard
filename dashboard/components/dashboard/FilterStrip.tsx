'use client';

import { Database } from 'lucide-react';

import type { CampaignOption, DateRange, KPIOverviewStats, MockUserProfile, UserRole } from '@/lib/types';

const RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: 'latest', label: 'Latest wk' },
  { value: 'last4', label: 'Last 4 wks' },
  { value: 'all', label: 'All weeks' },
];

interface FilterStripProps {
  role: UserRole;
  loading: boolean;
  campaigns: CampaignOption[];
  currentPersona: MockUserProfile | undefined;
  kpiOverview: KPIOverviewStats | null;
  selectedCampaignId: string;
  selectedChannel: string;
  selectedRange: DateRange;
  handleRangeChange: (range: DateRange) => void;
  handleCampaignChange: (campaignId: string) => void;
  handleChannelChange: (channel: string) => void;
}

export default function FilterStrip({
  role,
  loading,
  campaigns,
  currentPersona,
  kpiOverview,
  selectedCampaignId,
  selectedChannel,
  selectedRange,
  handleRangeChange,
  handleCampaignChange,
  handleChannelChange,
}: FilterStripProps) {
  return (
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

          <div
            role="group"
            aria-label="Week range"
            className="inline-flex items-center bg-surface-0 border border-slate-800 rounded-md p-0.5 font-mono text-[11px]"
          >
            {RANGE_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => handleRangeChange(o.value)}
                disabled={loading}
                aria-pressed={selectedRange === o.value}
                className={`px-2 py-0.5 rounded transition disabled:opacity-50 ${
                  selectedRange === o.value
                    ? 'bg-surface-1 border border-sky-500/60 text-sky-300'
                    : 'border border-transparent text-slate-400 hover:text-sky-300'
                }`}
              >
                {o.label}
              </button>
            ))}
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
  );
}
