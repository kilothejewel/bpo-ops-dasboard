import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import { getCampaigns, getCampaignTargets } from '@/lib/data-access';
import { findBreaches, formatSlackMessage } from '@/lib/alerts';
import { ALLOWED_RANGES } from '@/lib/query-params';
import type { DateRange, UserSession } from '@/lib/types';

/** Cross-campaign scope: this endpoint reports on every campaign. It is
 * gated by ALERTS_CRON_SECRET, not by a user session. */
const SYSTEM_SESSION: UserSession = { role: 'management', userId: 'system:alerts' };
const SLACK_TIMEOUT_MS = 10_000;

function authorized(request: NextRequest, secret: string): boolean {
  const header = request.headers.get('authorization') ?? '';
  const provided = Buffer.from(header.replace(/^Bearer\s+/i, ''));
  const expected = Buffer.from(secret);
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

/**
 * POST /api/alerts/notify — posts below-target alerts to Slack.
 *
 * Meant to be called by a scheduler (cron, GitHub Actions schedule, Azure
 * Logic App) with `Authorization: Bearer $ALERTS_CRON_SECRET`.
 *   ?range=all|last4|latest   week window to evaluate (default: last4)
 *   ?dryRun=1                 return the Slack payload without sending
 * Disabled (503) until ALERTS_CRON_SECRET is set; sending also needs
 * SLACK_WEBHOOK_URL.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.ALERTS_CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Alerts are not configured' }, { status: 503 });
  }
  if (!authorized(request, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const range = (params.get('range') || 'last4') as DateRange;
  if (!ALLOWED_RANGES.has(range)) {
    return NextResponse.json({ error: 'Invalid range' }, { status: 400 });
  }
  const dryRun = params.get('dryRun') === '1';

  try {
    const [targets, campaigns] = await Promise.all([
      getCampaignTargets(SYSTEM_SESSION, { range }),
      getCampaigns(SYSTEM_SESSION),
    ]);
    const breaches = findBreaches(targets, campaigns);
    const payload = formatSlackMessage(breaches, process.env.DASHBOARD_PUBLIC_URL);

    if (dryRun) {
      return NextResponse.json({ dryRun: true, range, breaches: breaches.length, payload });
    }

    const webhook = process.env.SLACK_WEBHOOK_URL;
    if (!webhook) {
      return NextResponse.json({ error: 'SLACK_WEBHOOK_URL is not set' }, { status: 503 });
    }
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(SLACK_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`Slack webhook returned ${res.status}`);
      return NextResponse.json({ error: 'Slack webhook rejected the message' }, { status: 502 });
    }
    return NextResponse.json({ sent: true, range, breaches: breaches.length });
  } catch (error: unknown) {
    console.error('Error sending alerts:', error);
    return NextResponse.json({ error: 'An internal error occurred while sending alerts.' }, { status: 500 });
  }
}
