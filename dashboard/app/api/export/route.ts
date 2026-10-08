import { NextRequest, NextResponse } from 'next/server';
import { getInteractionsForExport, MissingCampaignAccessError, EXPORT_ROW_LIMIT } from '@/lib/data-access';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/session';
import { parseDashboardQuery } from '@/lib/query-params';
import { toCsv } from '@/lib/csv';
import type { InteractionRecord } from '@/lib/types';

const COLUMNS: { key: keyof InteractionRecord; header: string }[] = [
  { key: 'interaction_id', header: 'interaction_id' },
  { key: 'campaign_id', header: 'campaign_id' },
  { key: 'campaign_name', header: 'campaign_name' },
  { key: 'client_name', header: 'client_name' },
  { key: 'agent_id', header: 'agent_id' },
  { key: 'agent_name', header: 'agent_name' },
  { key: 'channel', header: 'channel' },
  { key: 'opened_at', header: 'opened_at_utc' },
  { key: 'first_response_at', header: 'first_response_at_utc' },
  { key: 'resolved_at', header: 'resolved_at_utc' },
  { key: 'answer_time_seconds', header: 'answer_time_seconds' },
  { key: 'first_reply_time_minutes', header: 'first_reply_time_minutes' },
  { key: 'resolution_time_minutes', header: 'resolution_time_minutes' },
  { key: 'call_duration_seconds', header: 'call_duration_seconds' },
  { key: 'csat_score', header: 'csat_score' },
  { key: 'is_call_answered_under_1min', header: 'is_call_answered_under_1min' },
];

/**
 * CSV download of the interactions matching the current dashboard filters.
 * Same session + RBAC as /api/dashboard: a standard session only ever
 * exports its own campaign, whatever campaignId is requested.
 */
export async function GET(request: NextRequest) {
  try {
    const session = verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const parsed = parseDashboardQuery(new URL(request.url).searchParams);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const q = parsed.value;

    const rows = await getInteractionsForExport(
      session,
      { campaignId: q.campaignId, range: q.range, channel: q.channel, search: q.search, week: q.week ?? undefined },
      q.sort
    );
    const truncated = rows.length > EXPORT_ROW_LIMIT;

    const scope = session.role === 'standard' ? session.campaignId : q.campaignId;
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `interactions_${scope}_${q.week ?? q.range}_${stamp}.csv`.toLowerCase();

    return new NextResponse(toCsv(truncated ? rows.slice(0, EXPORT_ROW_LIMIT) : rows, COLUMNS), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
        'X-Export-Truncated': String(truncated),
      },
    });
  } catch (error: unknown) {
    if (error instanceof MissingCampaignAccessError) {
      return NextResponse.json({ error: 'Forbidden: Standard session has no assigned campaign' }, { status: 403 });
    }
    console.error('Error exporting interactions:', error);
    return NextResponse.json({ error: 'An internal error occurred while exporting.' }, { status: 500 });
  }
}
