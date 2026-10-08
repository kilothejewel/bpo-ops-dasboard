import { NextRequest, NextResponse } from 'next/server';
import { 
  getCampaigns, 
  getKPIOverview, 
  getWeeklyTrendData, 
  getGranularInteractions, 
  getCampaignTargets,
  getWeekOverWeek,
  getAgentLeaderboard,
  MissingCampaignAccessError,
} from '@/lib/data-access';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/session';
import { parseDashboardQuery } from '@/lib/query-params';

const PAGE_SIZE = 8;

export async function GET(request: NextRequest) {
  try {
    // Role/campaignId now come from a signed, httpOnly cookie verified
    // server-side — NOT from query params. A missing or invalid session
    // fails closed (401), rather than silently defaulting to a role.
    const session = verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const parsed = parseDashboardQuery(new URL(request.url).searchParams);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const q = parsed.value;
    const scope = { campaignId: q.campaignId, range: q.range };
    const interactionFilters = { ...scope, channel: q.channel, search: q.search, week: q.week ?? undefined };

    const [campaigns, kpiOverview, weeklyTrends, interactions, targets, weekOverWeek, agents] = await Promise.all([
      getCampaigns(session),
      getKPIOverview(session, scope),
      getWeeklyTrendData(session, scope),
      getGranularInteractions(session, interactionFilters, q.page, PAGE_SIZE, q.sort),
      getCampaignTargets(session, scope),
      getWeekOverWeek(session, { campaignId: q.campaignId }),
      getAgentLeaderboard(session, { ...scope, channel: q.channel, week: q.week ?? undefined }),
    ]);

    return NextResponse.json({
      session,
      campaigns,
      kpiOverview,
      weeklyTrends,
      interactions,
      targets,
      weekOverWeek,
      agents,
    });
  } catch (error: unknown) {
    if (error instanceof MissingCampaignAccessError) {
      console.warn('RBAC fail-closed: standard session has no assigned campaignId');
      return NextResponse.json(
        { error: 'Forbidden: Standard session has no assigned campaign' },
        { status: 403 }
      );
    }

    // Log full detail server-side only; never return raw DB/error internals
    // (column names, connection info, stack traces) to the client.
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'An internal error occurred while fetching dashboard data.' },
      { status: 500 }
    );
  }
}
