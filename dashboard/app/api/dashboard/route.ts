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
import { InteractionSort } from '@/lib/types';

const ALLOWED_CHANNELS = new Set(['ALL', 'phone', 'email', 'ticket', 'chat']);
const ALLOWED_SORTS = new Set<InteractionSort>(['opened_desc', 'opened_asc', 'delay_asc', 'delay_desc', 'csat_desc', 'csat_asc']);
// CMP-101 style campaign IDs, or the literal 'ALL' sentinel.
const CAMPAIGN_ID_PATTERN = /^(ALL|CMP-\d{3,})$/;
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

    const { searchParams } = new URL(request.url);
    // These only ever narrow a query WITHIN the session's already-verified
    // access scope (see getEnforcedCampaignFilter in data-access.ts, which
    // ignores requested campaignId entirely for role === 'standard'). They
    // are still validated against an allowlist/pattern so malformed input
    // fails loudly (400) instead of silently returning an empty result set.
    const selectedCampaignId = searchParams.get('campaignId') || 'ALL';
    const channelFilter = searchParams.get('channel') || 'ALL';
    const sortParam = (searchParams.get('sort') || 'opened_desc') as InteractionSort;
    const pageParam = Number.parseInt(searchParams.get('page') || '1', 10);

    if (!CAMPAIGN_ID_PATTERN.test(selectedCampaignId)) {
      return NextResponse.json({ error: 'Invalid campaignId' }, { status: 400 });
    }
    if (!ALLOWED_CHANNELS.has(channelFilter)) {
      return NextResponse.json({ error: 'Invalid channel' }, { status: 400 });
    }
    if (!ALLOWED_SORTS.has(sortParam)) {
      return NextResponse.json({ error: 'Invalid sort' }, { status: 400 });
    }
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

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
