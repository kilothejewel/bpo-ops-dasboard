import { NextRequest, NextResponse } from 'next/server';
import { getCampaigns, getKPIOverview, getWeeklyTrendData, getGranularInteractions, getCampaignTargets } from '@/lib/data-access';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    // Role/campaignId now come from a signed, httpOnly cookie verified
    // server-side — NOT from query params. A missing or invalid session
    // fails closed (401), rather than silently defaulting to a role.
    const session = verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    // campaignId here only ever narrows a query WITHIN the session's already
    //-verified access scope (see getEnforcedCampaignFilter in data-access.ts,
    // which ignores this for role === 'standard' entirely).
    const selectedCampaignId = searchParams.get('campaignId') || 'ALL';
    const channelFilter = searchParams.get('channel') || 'ALL';

    const [campaigns, kpiOverview, weeklyTrends, interactions, targets] = await Promise.all([
      getCampaigns(session),
      getKPIOverview(session, selectedCampaignId),
      getWeeklyTrendData(session, selectedCampaignId),
      getGranularInteractions(session, selectedCampaignId, channelFilter, 50),
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
  } catch (error: any) {
    // Log full detail server-side only; never return raw DB/error internals
    // (column names, connection info, stack traces) to the client.
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'An internal error occurred while fetching dashboard data.' },
      { status: 500 }
    );
  }
}
