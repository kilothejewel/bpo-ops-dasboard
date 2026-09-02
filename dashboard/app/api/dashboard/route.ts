import { NextRequest, NextResponse } from 'next/server';
import { getCampaigns, getKPIOverview, getWeeklyTrendData, getGranularInteractions, getCampaignTargets } from '@/lib/data-access';
import { UserSession, UserRole } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = (searchParams.get('role') as UserRole) || 'management';
    const userCampaignId = searchParams.get('userCampaignId') || 'CMP-101';
    const selectedCampaignId = searchParams.get('campaignId') || 'ALL';
    const channelFilter = searchParams.get('channel') || 'ALL';

    const session: UserSession = {
      role,
      campaignId: role === 'standard' ? userCampaignId : undefined,
    };

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
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: error.message || 'Database query error' }, { status: 500 });
  }
}
