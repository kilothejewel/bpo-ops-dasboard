import type { CampaignOption, CampaignTarget } from './types';

/** Human labels for campaign_targets.metric_name, and which way is "good". */
export const METRIC_LABELS: Record<string, { label: string; higherIsBetter: boolean }> = {
  calls_answered_under_1min_pct: { label: 'Phone SLA (<1 min)', higherIsBetter: true },
  csat_score_pct: { label: 'CSAT top-box', higherIsBetter: true },
  email_first_reply_mins: { label: 'Email first reply', higherIsBetter: false },
  email_resolution_mins: { label: 'Email resolution', higherIsBetter: false },
};

export interface Breach {
  campaignId: string;
  campaignName: string;
  metric: string;
  metricLabel: string;
  actual: number;
  target: number;
  unit: string;
  higherIsBetter: boolean;
  /** How far past the target, in the metric's own unit (always positive). */
  gap: number;
}

/** Targets currently missed (is_met === false). "No data" (null) is not a
 * breach. Sorted worst-first by relative gap. */
export function findBreaches(targets: CampaignTarget[], campaigns: CampaignOption[]): Breach[] {
  const names = new Map(campaigns.map((c) => [c.campaign_id, c.campaign_name]));
  return targets
    .filter((t) => t.is_met === false && t.actual_value !== null)
    .map((t) => {
      const meta = METRIC_LABELS[t.metric_name] ?? { label: t.metric_name, higherIsBetter: true };
      const actual = t.actual_value as number;
      return {
        campaignId: t.campaign_id,
        campaignName: names.get(t.campaign_id) ?? t.campaign_id,
        metric: t.metric_name,
        metricLabel: meta.label,
        actual,
        target: t.target_value,
        unit: t.unit,
        higherIsBetter: meta.higherIsBetter,
        gap: Math.abs(actual - t.target_value),
      };
    })
    .sort((a, b) => b.gap / (b.target || 1) - a.gap / (a.target || 1));
}

export function formatValue(value: number, unit: string): string {
  return unit === '%' ? `${value.toFixed(2)}%` : `${value.toFixed(1)} ${unit === 'minutes' ? 'min' : unit}`;
}

export function describeBreach(b: Breach): string {
  const cmp = b.higherIsBetter ? '≥' : '≤';
  return `${b.metricLabel}: ${formatValue(b.actual, b.unit)} (target ${cmp} ${formatValue(b.target, b.unit)})`;
}

/** Slack incoming-webhook payload (mrkdwn text). Campaign names come from
 * our own warehouse, but are still escaped per Slack's rules. */
export function formatSlackMessage(breaches: Breach[], dashboardUrl?: string): { text: string } {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (breaches.length === 0) return { text: ':white_check_mark: *BPO Ops:* all campaign targets are on track.' };
  const lines = breaches.map((b) => `• *${esc(b.campaignId)} ${esc(b.campaignName)}* — ${esc(describeBreach(b))}`);
  const header = `:rotating_light: *BPO Ops: ${breaches.length} target${breaches.length === 1 ? '' : 's'} below goal*`;
  const link = dashboardUrl ? `\n<${dashboardUrl}|Open dashboard>` : '';
  return { text: [header, ...lines].join('\n') + link };
}
