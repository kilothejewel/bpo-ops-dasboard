import type { ReactNode } from 'react';

import type { InteractionRecord } from '@/lib/types';
import { formatDelay } from '@/lib/format';

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

export interface InteractionColumn {
  id: string;
  header: string;
  /** Always shown; can't be toggled off (keeps rows identifiable). */
  required?: boolean;
  align?: 'left' | 'right' | 'center';
  cellClassName?: string;
  render: (row: InteractionRecord) => ReactNode;
}

export const INTERACTION_COLUMNS: InteractionColumn[] = [
  {
    id: 'interaction_id',
    header: 'Interaction ID',
    required: true,
    cellClassName: 'text-slate-100 font-medium group-hover:text-sky-400 transition',
    render: (row) => row.interaction_id,
  },
  {
    id: 'campaign',
    header: 'Campaign',
    render: (row) => (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-sky-950/60 text-sky-300 border border-sky-800/60">
        {row.campaign_name}
      </span>
    ),
  },
  {
    id: 'agent',
    header: 'Assigned Agent',
    cellClassName: 'font-sans text-slate-300',
    render: (row) => row.agent_name,
  },
  {
    id: 'channel',
    header: 'Channel',
    render: (row) => (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase border ${
          CHANNEL_STYLES[row.channel] || CHANNEL_STYLES.chat
        }`}
      >
        {row.channel}
      </span>
    ),
  },
  {
    id: 'opened_at',
    header: 'Opened At (UTC)',
    cellClassName: 'text-slate-500 text-[11px]',
    render: (row) => row.opened_at,
  },
  {
    id: 'answer_delay',
    header: 'Answer Delay',
    align: 'right',
    cellClassName: 'tabular-nums text-slate-300',
    render: (row) => formatDelay(row.answer_time_seconds),
  },
  {
    id: 'csat',
    header: 'CSAT',
    align: 'center',
    render: (row) =>
      row.csat_score !== null ? (
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded font-medium border ${csatChipClasses(row.csat_score)}`}>
          {row.csat_score} / 5
        </span>
      ) : (
        <span className="text-slate-600">--</span>
      ),
  },
  {
    id: 'sla',
    header: 'SLA Metric',
    align: 'right',
    render: (row) =>
      row.is_call_answered_under_1min === 1 ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950/50 text-emerald-300 border border-emerald-800/50">
          Met (&lt;1m)
        </span>
      ) : row.is_call_answered_under_1min === 0 ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-950/50 text-red-400 border border-red-800/50">
          Missed (&gt;1m)
        </span>
      ) : (
        <span className="text-slate-600 text-[11px]">--</span>
      ),
  },
];

export const ALIGN_CLASS = { left: '', right: 'text-right', center: 'text-center' } as const;
