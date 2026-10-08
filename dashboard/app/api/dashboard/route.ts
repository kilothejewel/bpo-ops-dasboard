import { NextRequest, NextResponse } from 'next/server';
import { 
  getCampaigns, 
  getKPIOverview, 
  getWeeklyTrendData, 
  getGranularInteractions, 
  getCampaignTargets,
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
    const { campaignId: selectedCampaignId, channel: channelFilter, sort: sortParam, page } = parsed.value;

    const [campaigns, kpiOverview, weeklyTrends, interactions, targets] = await Promise.all([
      getCampaigns(session),
      getKPIOverview(session, selectedCampaignId),
      getWeeklyTrendData(session, selectedCampaignId),
      getGranularInteractions(session, selectedCampaignId, channelFilter, page, PAGE_SIZE, sortParam),
      getCampaignTargets(session, selectedCampaignId),
    ]);

    return NextResponse.json({
      session,
      campaigns,
      kpiOverview,
      weeklyTrends,
      interactions,
      targets,
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
