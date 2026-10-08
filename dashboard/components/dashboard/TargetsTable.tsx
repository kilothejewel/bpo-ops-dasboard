import type { CampaignTarget } from '@/lib/types';

export default function TargetsTable({ targets }: { targets: CampaignTarget[] }) {
  return (
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
  );
}
