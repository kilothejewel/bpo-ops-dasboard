'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  PhoneCall, 
  Mail, 
  Ticket, 
  MessageSquare, 
  ShieldAlert, 
  ShieldCheck, 
  Filter, 
  UserCheck, 
  Activity, 
  TrendingUp, 
  Clock, 
  Smile, 
  Layers,
  RefreshCw,
  Database,
  Lock,
  Unlock
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

import { UserRole, CampaignOption, KPIOverviewStats, WeeklyKpiTrend, InteractionRecord, CampaignTarget } from '@/lib/types';

export default function Dashboard() {
  // Access Control & Filter States
  const [role, setRole] = useState<UserRole>('management');
  const [userCampaignId, setUserCampaignId] = useState<string>('CMP-101'); // For standard role
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('ALL');
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');

  // Data States
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [kpiOverview, setKpiOverview] = useState<KPIOverviewStats | null>(null);
  const [weeklyTrends, setWeeklyTrends] = useState<WeeklyKpiTrend[]>([]);
  const [interactions, setInteractions] = useState<InteractionRecord[]>([]);
  const [targets, setTargets] = useState<CampaignTarget[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Dashboard Data from API
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        role,
        userCampaignId,
        campaignId: role === 'standard' ? userCampaignId : selectedCampaignId,
        channel: selectedChannel,
      });

      const res = await fetch(`/api/dashboard?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const data = await res.json();
      
      setCampaigns(data.campaigns || []);
      setKpiOverview(data.kpiOverview || null);
      setWeeklyTrends(data.weeklyTrends || []);
      setInteractions(data.interactions || []);
      setTargets(data.targets || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  }, [role, userCampaignId, selectedCampaignId, selectedChannel]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sync selected campaign when switching to standard role
  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole === 'standard') {
      setSelectedCampaignId(userCampaignId);
    } else {
      setSelectedCampaignId('ALL');
    }
  };

  const handleStandardCampaignChange = (cId: string) => {
    setUserCampaignId(cId);
    setSelectedCampaignId(cId);
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Top Banner / Navigation */}
      <header className="glass-card rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-cyan-500 to-indigo-600 rounded-xl shadow-lg shadow-cyan-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
                BPO Operations Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Weekly Operational Performance & Medallion Pipeline Analytics
              </p>
            </div>
          </div>
        </div>

        {/* Access Tier Control & Refresh */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Role Switcher Pill */}
          <div className="flex items-center bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => handleRoleChange('management')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                role === 'management'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Unlock className="w-3.5 h-3.5" />
              Management Tier
            </button>
            <button
              onClick={() => handleRoleChange('standard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                role === 'standard'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              Standard Tier
            </button>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </header>

      {/* Filter Control Bar */}
      <section className="glass-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          {/* Role Access Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-medium">
            {role === 'management' ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300">Access: <strong className="text-emerald-400">Management (All Campaigns)</strong></span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span className="text-slate-300">Access: <strong className="text-amber-400">Standard (Restricted View)</strong></span>
              </>
            )}
          </div>

          {/* Standard User Assigned Campaign Selector */}
          {role === 'standard' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Assigned Campaign:</span>
              <select
                value={userCampaignId}
                onChange={(e) => handleStandardCampaignChange(e.target.value)}
                className="bg-slate-900 border border-cyan-500/30 text-cyan-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                {campaigns.map((c) => (
                  <option key={c.campaign_id} value={c.campaign_id}>
                    {c.campaign_name} ({c.client_name})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Management Campaign Filter Dropdown */}
          {role === 'management' && (
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">Campaign:</span>
              <select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Campaigns (Cross-Campaign)</option>
                {campaigns.map((c) => (
                  <option key={c.campaign_id} value={c.campaign_id}>
                    {c.campaign_name} - {c.client_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Channel Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Channel:</span>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Channels</option>
              <option value="phone">Phone</option>
              <option value="email">Email</option>
              <option value="ticket">Ticket</option>
              <option value="chat">Chat</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-indigo-400" />
          Layer: <span className="text-indigo-300 font-semibold">PostgreSQL public_marts</span>
        </div>
      </section>

      {error && (
        <div className="p-4 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-sm flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Overview Grid (Confirmed KPIs) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Phone SLA Card */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Phone SLA (&lt;1 Min)
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <PhoneCall className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-white">
              {kpiOverview ? `${kpiOverview.overall_phone_sla_pct}%` : '--'}
            </span>
            <div className={`px-2 py-0.5 rounded text-xs font-bold ${
              kpiOverview && kpiOverview.overall_phone_sla_pct >= kpiOverview.target_phone_sla_pct
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              Target: {kpiOverview ? `${kpiOverview.target_phone_sla_pct}%` : '90%'}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Evaluated Calls</span>
            <span className="font-semibold text-slate-200">
              {kpiOverview ? kpiOverview.total_calls_evaluated.toLocaleString() : 0}
            </span>
          </div>
        </div>

        {/* CSAT Card */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              CSAT Score (Top-Box)
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Smile className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-white">
              {kpiOverview ? `${kpiOverview.overall_csat_pct}%` : '--'}
            </span>
            <div className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Confirmed Baseline: {kpiOverview ? `${kpiOverview.target_csat_pct}%` : '45%'}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Rated Responses</span>
            <span className="font-semibold text-slate-200">
              {kpiOverview ? kpiOverview.csat_total_responses.toLocaleString() : 0}
            </span>
          </div>
        </div>

        {/* Email Response Times */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Email Response Time
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400">Avg First Reply:</span>
              <span className="text-xl font-bold text-emerald-400">
                {kpiOverview ? `${kpiOverview.avg_email_first_reply_mins}m` : '--'}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400">Avg Resolution:</span>
              <span className="text-xl font-bold text-indigo-400">
                {kpiOverview ? `${kpiOverview.avg_email_resolution_mins}m` : '--'}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>No Hard SLA</span>
            <span className="text-slate-400 italic">Reported as Avg</span>
          </div>
        </div>

        {/* Total Interaction Volume */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Total Volume
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white">
              {kpiOverview ? kpiOverview.total_interactions.toLocaleString() : 0}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-4 gap-1 text-center text-[10px] text-slate-400">
            <div>
              <div className="font-bold text-cyan-400">{kpiOverview?.total_calls || 0}</div>
              <div>Calls</div>
            </div>
            <div>
              <div className="font-bold text-emerald-400">{kpiOverview?.total_emails || 0}</div>
              <div>Emails</div>
            </div>
            <div>
              <div className="font-bold text-amber-400">{kpiOverview?.total_tickets || 0}</div>
              <div>Tickets</div>
            </div>
            <div>
              <div className="font-bold text-purple-400">{kpiOverview?.total_chats || 0}</div>
              <div>Chats</div>
            </div>
          </div>
        </div>
      </section>

      {/* Analytics Charts Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly SLA Adherence & CSAT Trend */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Weekly SLA & CSAT Trends
              </h2>
              <p className="text-xs text-slate-400">Phone SLA % vs CSAT Aggregate over weeks</p>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            {weeklyTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyTrends} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="week_name" stroke="#94a3b8" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} unit="%" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="actual_phone_sla_pct" name="Phone SLA %" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="target_phone_sla_pct" name="Phone SLA Target" stroke="#38bdf8" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="actual_csat_pct" name="CSAT Score %" stroke="#818cf8" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="target_csat_pct" name="CSAT Target (45%)" stroke="#fbbf24" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">No trend data available</div>
            )}
          </div>
        </div>

        {/* Weekly Volume Breakdown by Channel */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                Weekly Volume Breakdown by Channel
              </h2>
              <p className="text-xs text-slate-400">Interaction distribution across phone, email, ticket, chat</p>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            {weeklyTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyTrends} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="week_name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="call_volume" name="Phone Calls" stackId="a" fill="#06b6d4" />
                  <Bar dataKey="email_volume" name="Emails" stackId="a" fill="#10b981" />
                  <Bar dataKey="ticket_volume" name="Tickets" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="chat_volume" name="Chats" stackId="a" fill="#a855f7" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">No volume data available</div>
            )}
          </div>
        </div>
      </section>

      {/* Campaign Targets Matrix (Dynamic Joining Verification) */}
      <section className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              Dynamic Campaign Targets Matrix
            </h2>
            <p className="text-xs text-slate-400">
              Joined from <code className="text-emerald-300">public_marts.campaign_targets</code> — No hardcoded thresholds in code
            </p>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Campaign ID</th>
                <th className="px-4 py-3">Metric Name</th>
                <th className="px-4 py-3 text-right">Target Value</th>
                <th className="px-4 py-3">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {targets.map((t, idx) => (
                <tr key={`${t.campaign_id}-${t.metric_name}-${idx}`} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-cyan-400">{t.campaign_id}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-200">{t.metric_name}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-white">{t.target_value}</td>
                  <td className="px-4 py-2.5 text-slate-400">{t.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Granular Interaction Logs Table */}
      <section className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-cyan-400" />
              Recent Interaction Logs (Silver/Gold Fact Table)
            </h2>
            <p className="text-xs text-slate-400">
              Granular interaction records from <code className="text-cyan-300">public_marts.fct_interactions</code>
            </p>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Interaction ID</th>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Opened At</th>
                <th className="px-4 py-3 text-right">Answer Delay</th>
                <th className="px-4 py-3 text-center">CSAT</th>
                <th className="px-4 py-3 text-center">Phone SLA Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {interactions.length > 0 ? (
                interactions.map((item) => (
                  <tr key={item.interaction_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-cyan-400 font-medium">{item.interaction_id}</td>
                    <td className="px-4 py-2.5 text-slate-200">{item.campaign_name}</td>
                    <td className="px-4 py-2.5 text-slate-300">{item.agent_name}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.channel === 'phone' ? 'bg-cyan-500/20 text-cyan-400' :
                        item.channel === 'email' ? 'bg-emerald-500/20 text-emerald-400' :
                        item.channel === 'ticket' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-purple-500/20 text-purple-400'
                      }`}>
                        {item.channel}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 font-mono text-[11px]">{item.opened_at}</td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {item.answer_time_seconds !== null ? `${item.answer_time_seconds}s` : '--'}
                    </td>
                    <td className="px-4 py-2.5 text-center font-bold">
                      {item.csat_score !== null ? (
                        <span className={item.csat_score >= 4 ? 'text-emerald-400' : 'text-amber-400'}>
                          {item.csat_score} / 5
                        </span>
                      ) : (
                        <span className="text-slate-600">--</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {item.is_call_answered_under_1min !== null ? (
                        item.is_call_answered_under_1min === 1 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Met (&lt;1m)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            Missed (&gt;1m)
                          </span>
                        )
                      ) : (
                        <span className="text-slate-600 text-[10px]">N/A</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No interactions found matching current filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
