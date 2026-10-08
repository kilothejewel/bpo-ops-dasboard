import { describe, expect, it } from 'vitest';
import { findBreaches, formatSlackMessage, describeBreach } from '@/lib/alerts';
import type { CampaignTarget } from '@/lib/types';

const t = (campaign_id: string, metric_name: string, target_value: number, unit: string, actual_value: number | null, is_met: boolean | null): CampaignTarget =>
  ({ campaign_id, metric_name, target_value, unit, actual_value, is_met });

const campaigns = [
  { campaign_id: 'CMP-101', campaign_name: 'FinTechCare', client_name: 'Apex' },
  { campaign_id: 'CMP-104', campaign_name: 'TechAssist', client_name: 'CloudScale' },
];

describe('findBreaches', () => {
  const targets = [
    t('CMP-101', 'calls_answered_under_1min_pct', 90, '%', 91.28, true),
    t('CMP-101', 'csat_score_pct', 45, '%', 44.36, false),
    t('CMP-104', 'email_first_reply_mins', 10, 'minutes', 25.46, false),
    t('CMP-104', 'email_resolution_mins', 90, 'minutes', null, null),
  ];

  it('keeps only missed targets, ignoring met and no-data rows', () => {
    const b = findBreaches(targets, campaigns);
    expect(b.map((x) => `${x.campaignId}/${x.metric}`)).toEqual([
      'CMP-104/email_first_reply_mins', // 155% over: worst first
      'CMP-101/csat_score_pct',
    ]);
    expect(b[0]).toMatchObject({ campaignName: 'TechAssist', higherIsBetter: false });
  });

  it('describes direction correctly', () => {
    const [reply, csat] = findBreaches(targets, campaigns);
    expect(describeBreach(reply)).toBe('Email first reply: 25.5 min (target ≤ 10.0 min)');
    expect(describeBreach(csat)).toBe('CSAT top-box: 44.36% (target ≥ 45.00%)');
  });
});

describe('formatSlackMessage', () => {
  it('summarizes breaches with a dashboard link', () => {
    const msg = formatSlackMessage(findBreaches([t('CMP-101', 'csat_score_pct', 45, '%', 44.36, false)], campaigns), 'https://ops.example/');
    expect(msg.text).toContain('1 target below goal');
    expect(msg.text).toContain('*CMP-101 FinTechCare*');
    expect(msg.text).toContain('<https://ops.example/|Open dashboard>');
  });

  it('escapes Slack control characters in names', () => {
    const msg = formatSlackMessage(
      findBreaches([t('CMP-101', 'csat_score_pct', 45, '%', 40, false)], [{ campaign_id: 'CMP-101', campaign_name: '<!channel> & co', client_name: '' }])
    );
    expect(msg.text).toContain('&lt;!channel&gt; &amp; co');
    expect(msg.text).not.toContain('<!channel>');
  });

  it('reports all-clear when nothing is breached', () => {
    expect(formatSlackMessage([]).text).toContain('on track');
  });
});
