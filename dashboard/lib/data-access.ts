import { pool } from './db';
import { 
  UserSession, 
  CampaignOption, 
  KPIOverviewStats, 
  WeeklyKpiTrend, 
  InteractionRecord, 
  CampaignTarget 
} from './types';

/**
 * Enforces server-side RBAC filtering based on session role.
 * Standard users can ONLY query their assigned campaign.
 * Management users can query all or filter by selected campaign.
 */
function getEnforcedCampaignFilter(session: UserSession, requestedCampaignId?: string): string | null {
  if (session.role === 'standard') {
    return session.campaignId || 'CMP-101'; // Default fallback if standard
  }
  if (requestedCampaignId && requestedCampaignId !== 'ALL') {
    return requestedCampaignId;
  }
  return null; // All campaigns
}

export async function getCampaigns(session: UserSession): Promise<CampaignOption[]> {
  const enforcedId = getEnforcedCampaignFilter(session);
  let query = 'SELECT campaign_id, campaign_name, client_name FROM public_marts.dim_campaign';
  const params: any[] = [];

  if (enforcedId) {
    query += ' WHERE campaign_id = $1';
    params.push(enforcedId);
  }

  query += ' ORDER BY campaign_name ASC';
  const result = await pool.query(query, params);
  return result.rows;
}

export async function getKPIOverview(
  session: UserSession, 
  requestedCampaignId?: string
): Promise<KPIOverviewStats> {
  const enforcedCampaignId = getEnforcedCampaignFilter(session, requestedCampaignId);
  const params: any[] = [];
  let campaignWhereClause = '';

  if (enforcedCampaignId) {
    campaignWhereClause = 'WHERE campaign_id = $1';
    params.push(enforcedCampaignId);
  }

  const query = `
    SELECT
      COALESCE(SUM(total_interactions), 0)::INT AS total_interactions,
      COALESCE(SUM(call_volume), 0)::INT AS total_calls,
      COALESCE(SUM(email_volume), 0)::INT AS total_emails,
      COALESCE(SUM(ticket_volume), 0)::INT AS total_tickets,
      COALESCE(SUM(chat_volume), 0)::INT AS total_chats,
      
      COALESCE(SUM(calls_answered_under_1min_count), 0)::INT AS calls_under_60s_count,
      COALESCE(SUM(total_calls_evaluated), 0)::INT AS total_calls_evaluated,
      
      ROUND(
        (COALESCE(SUM(calls_answered_under_1min_count), 0)::NUMERIC / 
        NULLIF(SUM(total_calls_evaluated), 0)) * 100.0, 2
      )::FLOAT AS overall_phone_sla_pct,
      
      COALESCE(AVG(target_phone_sla_pct), 90.0)::FLOAT AS target_phone_sla_pct,
      
      COALESCE(SUM(csat_satisfied_count), 0)::INT AS csat_satisfied_count,
      COALESCE(SUM(csat_total_responses), 0)::INT AS csat_total_responses,
      
      ROUND(
        (COALESCE(SUM(csat_satisfied_count), 0)::NUMERIC / 
        NULLIF(SUM(csat_total_responses), 0)) * 100.0, 2
      )::FLOAT AS overall_csat_pct,
      
      COALESCE(AVG(target_csat_pct), 45.0)::FLOAT AS target_csat_pct,
      
      COALESCE(ROUND(AVG(avg_email_first_reply_mins)::NUMERIC, 2), 0)::FLOAT AS avg_email_first_reply_mins,
      COALESCE(ROUND(AVG(avg_email_resolution_mins)::NUMERIC, 2), 0)::FLOAT AS avg_email_resolution_mins
    FROM public_marts.weekly_campaign_kpis
    ${campaignWhereClause}
  `;

  const result = await pool.query(query, params);
  const row = result.rows[0] || {};

  return {
    total_interactions: row.total_interactions || 0,
    total_calls: row.total_calls || 0,
    total_emails: row.total_emails || 0,
    total_tickets: row.total_tickets || 0,
    total_chats: row.total_chats || 0,
    calls_under_60s_count: row.calls_under_60s_count || 0,
    total_calls_evaluated: row.total_calls_evaluated || 0,
    overall_phone_sla_pct: row.overall_phone_sla_pct || 0,
    target_phone_sla_pct: row.target_phone_sla_pct || 90.0,
    csat_satisfied_count: row.csat_satisfied_count || 0,
    csat_total_responses: row.csat_total_responses || 0,
    overall_csat_pct: row.overall_csat_pct || 0,
    target_csat_pct: row.target_csat_pct || 45.0,
    avg_email_first_reply_mins: row.avg_email_first_reply_mins || 0,
    avg_email_resolution_mins: row.avg_email_resolution_mins || 0,
  };
}

export async function getWeeklyTrendData(
  session: UserSession,
  requestedCampaignId?: string
): Promise<WeeklyKpiTrend[]> {
  const enforcedCampaignId = getEnforcedCampaignFilter(session, requestedCampaignId);
  const params: any[] = [];
  let campaignWhereClause = '';

  if (enforcedCampaignId) {
    campaignWhereClause = 'WHERE campaign_id = $1';
    params.push(enforcedCampaignId);
  }

  const query = `
    SELECT
      campaign_id,
      campaign_name,
      year,
      week,
      week_name,
      TO_CHAR(week_start_date, 'YYYY-MM-DD') AS week_start_date,
      total_interactions,
      call_volume,
      email_volume,
      ticket_volume,
      chat_volume,
      actual_phone_sla_pct::FLOAT,
      target_phone_sla_pct::FLOAT,
      is_phone_sla_met,
      actual_csat_pct::FLOAT,
      target_csat_pct::FLOAT,
      avg_email_first_reply_mins::FLOAT,
      avg_email_resolution_mins::FLOAT
    FROM public_marts.weekly_campaign_kpis
    ${campaignWhereClause}
    ORDER BY year ASC, week ASC, campaign_name ASC
  `;

  const result = await pool.query(query, params);
  return result.rows;
}

export async function getGranularInteractions(
  session: UserSession,
  requestedCampaignId?: string,
  channelFilter?: string,
  limit: number = 50
): Promise<InteractionRecord[]> {
  const enforcedCampaignId = getEnforcedCampaignFilter(session, requestedCampaignId);
  const conditions: string[] = [];
  const params: any[] = [];

  if (enforcedCampaignId) {
    params.push(enforcedCampaignId);
    conditions.push(`f.campaign_id = $${params.length}`);
  }

  if (channelFilter && channelFilter !== 'ALL') {
    params.push(channelFilter);
    conditions.push(`f.channel = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  params.push(limit);
  const limitParamIndex = params.length;

  const query = `
    SELECT
      f.interaction_id,
      f.campaign_id,
      c.campaign_name,
      c.client_name,
      f.agent_id,
      a.agent_name,
      f.channel,
      TO_CHAR(f.opened_at, 'YYYY-MM-DD HH24:MI:SS') AS opened_at,
      TO_CHAR(f.first_response_at, 'YYYY-MM-DD HH24:MI:SS') AS first_response_at,
      TO_CHAR(f.resolved_at, 'YYYY-MM-DD HH24:MI:SS') AS resolved_at,
      f.csat_score,
      f.call_duration_seconds,
      f.answer_time_seconds,
      f.first_reply_time_minutes::FLOAT,
      f.resolution_time_minutes::FLOAT,
      f.is_call_answered_under_1min
    FROM public_marts.fct_interactions f
    JOIN public_marts.dim_campaign c ON f.campaign_id = c.campaign_id
    JOIN public_marts.dim_agent a ON f.agent_id = a.agent_id
    ${whereClause}
    ORDER BY f.opened_at DESC
    LIMIT $${limitParamIndex}
  `;

  const result = await pool.query(query, params);
  return result.rows;
}

export async function getCampaignTargets(
  session: UserSession,
  requestedCampaignId?: string
): Promise<CampaignTarget[]> {
  const enforcedCampaignId = getEnforcedCampaignFilter(session, requestedCampaignId);
  const params: any[] = [];
  let whereClause = '';

  if (enforcedCampaignId) {
    whereClause = 'WHERE campaign_id = $1';
    params.push(enforcedCampaignId);
  }

  const query = `
    SELECT campaign_id, metric_name, target_value::FLOAT, unit
    FROM public_marts.campaign_targets
    ${whereClause}
    ORDER BY campaign_id ASC, metric_name ASC
  `;

  const result = await pool.query(query, params);
  return result.rows;
}
