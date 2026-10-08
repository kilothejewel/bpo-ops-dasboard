import { pool } from './db';
import { 
  UserSession, 
  CampaignOption, 
  KPIOverviewStats, 
  WeeklyKpiTrend, 
  InteractionRecord, 
  CampaignTarget,
  PaginatedInteractions,
  InteractionSort,
  DateRange,
} from './types';

export class MissingCampaignAccessError extends Error {
  constructor(message = 'Standard session missing campaignId') {
    super(message);
    this.name = 'MissingCampaignAccessError';
  }
}

/**
 * Enforces server-side RBAC filtering based on session role.
 * Standard users can ONLY query their assigned campaign.
 * Standard sessions without an assigned campaign fail closed and throw.
 * Management users can query all or filter by selected campaign.
 */
export function getEnforcedCampaignFilter(session: UserSession, requestedCampaignId?: string): string | null {
  if (session.role === 'standard') {
    if (!session.campaignId) {
      throw new MissingCampaignAccessError('Standard session missing campaignId');
    }
    return session.campaignId;
  }
  if (requestedCampaignId && requestedCampaignId !== 'ALL') {
    return requestedCampaignId;
  }
  return null; // All campaigns
}

/** Collects parameterized WHERE conditions; `bind` returns the placeholder. */
class SqlFilter {
  readonly params: unknown[] = [];
  private readonly conditions: string[] = [];

  bind(value: unknown): string {
    this.params.push(value);
    return `$${this.params.length}`;
  }

  add(condition: string): void {
    this.conditions.push(condition);
  }

  where(): string {
    return this.conditions.length ? `WHERE ${this.conditions.join(' AND ')}` : '';
  }
}

const RANGE_WEEKS: Record<Exclude<DateRange, 'all'>, number> = { latest: 1, last4: 4 };

/**
 * Restricts rows to the N most recent ISO weeks present in the data. Weeks
 * are identified by (year, week) — not week_start_date, which in
 * weekly_campaign_kpis is the first day with activity, not the Monday.
 */
function addRangeCondition(filter: SqlFilter, range: DateRange | undefined, yearCol: string, weekCol: string) {
  if (!range || range === 'all') return;
  const limit = filter.bind(RANGE_WEEKS[range]);
  filter.add(`(${yearCol}, ${weekCol}) IN (
    SELECT year, week FROM (SELECT DISTINCT year, week FROM public_marts.weekly_campaign_kpis) w
    ORDER BY year DESC, week DESC LIMIT ${limit}
  )`);
}

/** Escapes LIKE wildcards so user input is matched literally. */
function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export interface ScopeOptions {
  /** Requested campaign; ignored for standard sessions (see getEnforcedCampaignFilter). */
  campaignId?: string;
  range?: DateRange;
}

export interface InteractionFilterOptions extends ScopeOptions {
  channel?: string;
  /** Free-text match on interaction ID, agent, campaign or channel. */
  search?: string;
  /** ISO week name, e.g. "2026-W30" (chart drill-down). */
  week?: string;
}

/** WHERE clause shared by the interactions table, CSV export and agent
 * leaderboard, over fct_interactions f / dim_campaign c / dim_agent a / dim_date d. */
function buildInteractionFilter(session: UserSession, opts: InteractionFilterOptions): SqlFilter {
  const filter = new SqlFilter();
  const enforcedCampaignId = getEnforcedCampaignFilter(session, opts.campaignId);
  if (enforcedCampaignId) filter.add(`f.campaign_id = ${filter.bind(enforcedCampaignId)}`);
  if (opts.channel && opts.channel !== 'ALL') filter.add(`f.channel = ${filter.bind(opts.channel)}`);
  addRangeCondition(filter, opts.range, 'd.year', 'd.week');
  if (opts.week) filter.add(`d.week_name = ${filter.bind(opts.week)}`);
  if (opts.search) {
    const p = filter.bind(likePattern(opts.search));
    filter.add(`(f.interaction_id ILIKE ${p} OR a.agent_name ILIKE ${p} OR c.campaign_name ILIKE ${p} OR f.channel ILIKE ${p})`);
  }
  return filter;
}

const INTERACTION_FROM = `
    FROM public_marts.fct_interactions f
    JOIN public_marts.dim_campaign c ON f.campaign_id = c.campaign_id
    JOIN public_marts.dim_agent a ON f.agent_id = a.agent_id
    JOIN public_marts.dim_date d ON f.date_key = d.date_key`;

/** WHERE clause for queries over weekly_campaign_kpis. */
function buildKpiFilter(session: UserSession, opts: ScopeOptions): SqlFilter {
  const filter = new SqlFilter();
  const enforcedCampaignId = getEnforcedCampaignFilter(session, opts.campaignId);
  if (enforcedCampaignId) filter.add(`campaign_id = ${filter.bind(enforcedCampaignId)}`);
  addRangeCondition(filter, opts.range, 'year', 'week');
  return filter;
}

export async function getCampaigns(session: UserSession): Promise<CampaignOption[]> {
  const enforcedId = getEnforcedCampaignFilter(session);
  let query = 'SELECT campaign_id, campaign_name, client_name FROM public_marts.dim_campaign';
  const params: unknown[] = [];

  if (enforcedId) {
    query += ' WHERE campaign_id = $1';
    params.push(enforcedId);
  }

  query += ' ORDER BY campaign_name ASC';
  const result = await pool.query(query, params);
  return result.rows;
}

export async function getKPIOverview(session: UserSession, opts: ScopeOptions = {}): Promise<KPIOverviewStats> {
  const filter = buildKpiFilter(session, opts);

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
      
      AVG(target_phone_sla_pct)::FLOAT AS target_phone_sla_pct,
      
      COALESCE(SUM(csat_satisfied_count), 0)::INT AS csat_satisfied_count,
      COALESCE(SUM(csat_total_responses), 0)::INT AS csat_total_responses,
      
      ROUND(
        (COALESCE(SUM(csat_satisfied_count), 0)::NUMERIC / 
        NULLIF(SUM(csat_total_responses), 0)) * 100.0, 2
      )::FLOAT AS overall_csat_pct,
      
      AVG(target_csat_pct)::FLOAT AS target_csat_pct,
      
      COALESCE(ROUND(AVG(avg_email_first_reply_mins)::NUMERIC, 2), 0)::FLOAT AS avg_email_first_reply_mins,
      COALESCE(ROUND(AVG(avg_email_resolution_mins)::NUMERIC, 2), 0)::FLOAT AS avg_email_resolution_mins
    FROM public_marts.weekly_campaign_kpis
    ${filter.where()}
  `;

  const result = await pool.query(query, filter.params);
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
    target_phone_sla_pct: row.target_phone_sla_pct !== null && row.target_phone_sla_pct !== undefined ? Number(row.target_phone_sla_pct) : null,
    csat_satisfied_count: row.csat_satisfied_count || 0,
    csat_total_responses: row.csat_total_responses || 0,
    overall_csat_pct: row.overall_csat_pct || 0,
    target_csat_pct: row.target_csat_pct !== null && row.target_csat_pct !== undefined ? Number(row.target_csat_pct) : null,
    avg_email_first_reply_mins: row.avg_email_first_reply_mins || 0,
    avg_email_resolution_mins: row.avg_email_resolution_mins || 0,
  };
}

export async function getWeeklyTrendData(session: UserSession, opts: ScopeOptions = {}): Promise<WeeklyKpiTrend[]> {
  const filter = buildKpiFilter(session, opts);

  // Aggregated across campaigns per week when no single campaign is enforced,
  // so the trend chart shows one line per week rather than one per
  // campaign-week when management selects "All Campaigns".
  const query = `
    SELECT
      year,
      week,
      MIN(week_name) AS week_name,
      MIN(week_start_date)::TEXT AS week_start_date,
      SUM(total_interactions)::INT AS total_interactions,
      SUM(call_volume)::INT AS call_volume,
      SUM(email_volume)::INT AS email_volume,
      SUM(ticket_volume)::INT AS ticket_volume,
      SUM(chat_volume)::INT AS chat_volume,
      ROUND(
        (SUM(calls_answered_under_1min_count)::NUMERIC / NULLIF(SUM(total_calls_evaluated), 0)) * 100.0, 2
      )::FLOAT AS actual_phone_sla_pct,
      AVG(target_phone_sla_pct)::FLOAT AS target_phone_sla_pct,
      ROUND(
        (SUM(csat_satisfied_count)::NUMERIC / NULLIF(SUM(csat_total_responses), 0)) * 100.0, 2
      )::FLOAT AS actual_csat_pct,
      AVG(target_csat_pct)::FLOAT AS target_csat_pct
    FROM public_marts.weekly_campaign_kpis
    ${filter.where()}
    GROUP BY year, week
    ORDER BY year ASC, week ASC
  `;

  const result = await pool.query(query, filter.params);
  return result.rows;
}

const SORT_CLAUSES: Record<InteractionSort, string> = {
  opened_desc: 'f.opened_at DESC',
  opened_asc: 'f.opened_at ASC',
  delay_asc: 'f.answer_time_seconds ASC NULLS LAST',
  delay_desc: 'f.answer_time_seconds DESC NULLS LAST',
  csat_desc: 'f.csat_score DESC NULLS LAST',
  csat_asc: 'f.csat_score ASC NULLS LAST',
};

const INTERACTION_COLUMNS = `
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
      f.is_call_answered_under_1min`;

export async function getGranularInteractions(
  session: UserSession,
  opts: InteractionFilterOptions = {},
  page: number = 1,
  pageSize: number = 8,
  sort: InteractionSort = 'opened_desc'
): Promise<PaginatedInteractions> {
  const filter = buildInteractionFilter(session, opts);
  const orderClause = SORT_CLAUSES[sort] || SORT_CLAUSES.opened_desc;
  const safePage = Math.max(1, Math.floor(page));
  const limit = filter.bind(pageSize);
  const offset = filter.bind((safePage - 1) * pageSize);

  // COUNT(*) OVER() piggybacks the total row count onto the same query
  // (one round trip) so the UI can render real pagination controls.
  const query = `
    SELECT ${INTERACTION_COLUMNS},
      COUNT(*) OVER()::INT AS total_count
    ${INTERACTION_FROM}
    ${filter.where()}
    ORDER BY ${orderClause}, f.interaction_id
    LIMIT ${limit} OFFSET ${offset}
  `;

  const result = await pool.query(query, filter.params);
  const total = result.rows[0]?.total_count ?? 0;
  const rows: InteractionRecord[] = result.rows.map(({ total_count: _total_count, ...rest }) => rest);

  return { rows, total, page: safePage, pageSize };
}

/** Hard cap so an export can't turn into an unbounded table dump. */
export const EXPORT_ROW_LIMIT = 50_000;

/** All interactions matching the filters (no pagination), for CSV export.
 * Same RBAC + filter path as getGranularInteractions. Returns one extra row
 * beyond the cap so callers can tell the result was truncated. */
export async function getInteractionsForExport(
  session: UserSession,
  opts: InteractionFilterOptions = {},
  sort: InteractionSort = 'opened_desc'
): Promise<InteractionRecord[]> {
  const filter = buildInteractionFilter(session, opts);
  const orderClause = SORT_CLAUSES[sort] || SORT_CLAUSES.opened_desc;
  const limit = filter.bind(EXPORT_ROW_LIMIT + 1);
  const query = `
    SELECT ${INTERACTION_COLUMNS}
    ${INTERACTION_FROM}
    ${filter.where()}
    ORDER BY ${orderClause}, f.interaction_id
    LIMIT ${limit}
  `;
  const result = await pool.query(query, filter.params);
  return result.rows;
}

// Metrics where a HIGHER actual value is better (percentages: SLA %, CSAT %).
const HIGHER_IS_BETTER = new Set(['calls_answered_under_1min_pct', 'csat_score_pct']);

export async function getCampaignTargets(session: UserSession, opts: ScopeOptions = {}): Promise<CampaignTarget[]> {
  const filter = new SqlFilter();
  const enforcedCampaignId = getEnforcedCampaignFilter(session, opts.campaignId);
  const rangeFilter = new SqlFilter();
  addRangeCondition(rangeFilter, opts.range, 'year', 'week');
  // The range subquery's placeholders are bound first so both clauses share
  // one params array.
  for (const p of rangeFilter.params) filter.bind(p);
  if (enforcedCampaignId) filter.add(`t.campaign_id = ${filter.bind(enforcedCampaignId)}`);

  // Joins each target against a live aggregate of the SAME underlying
  // computation used in weekly_campaign_kpis.sql (summed over the selected
  // week range), so the "actual" column is never a decorative number.
  const query = `
    WITH actuals AS (
      SELECT
        campaign_id,
        ROUND((SUM(calls_answered_under_1min_count)::NUMERIC / NULLIF(SUM(total_calls_evaluated), 0)) * 100.0, 2) AS calls_answered_under_1min_pct,
        ROUND((SUM(csat_satisfied_count)::NUMERIC / NULLIF(SUM(csat_total_responses), 0)) * 100.0, 2) AS csat_score_pct,
        ROUND(AVG(avg_email_first_reply_mins)::NUMERIC, 2) AS email_first_reply_mins,
        ROUND(AVG(avg_email_resolution_mins)::NUMERIC, 2) AS email_resolution_mins
      FROM public_marts.weekly_campaign_kpis
      ${rangeFilter.where()}
      GROUP BY campaign_id
    )
    SELECT
      t.campaign_id,
      t.metric_name,
      t.target_value::FLOAT,
      t.unit,
      (CASE t.metric_name
        WHEN 'calls_answered_under_1min_pct' THEN a.calls_answered_under_1min_pct
        WHEN 'csat_score_pct' THEN a.csat_score_pct
        WHEN 'email_first_reply_mins' THEN a.email_first_reply_mins
        WHEN 'email_resolution_mins' THEN a.email_resolution_mins
      END)::FLOAT AS actual_value
    FROM public_marts.campaign_targets t
    LEFT JOIN actuals a ON a.campaign_id = t.campaign_id
    ${filter.where()}
    ORDER BY t.campaign_id ASC, t.metric_name ASC
  `;

  const result = await pool.query(query, filter.params);

  return result.rows.map((row) => {
    const actual = row.actual_value === null || row.actual_value === undefined ? null : Number(row.actual_value);
    let is_met: boolean | null = null;
    if (actual !== null) {
      is_met = HIGHER_IS_BETTER.has(row.metric_name)
        ? actual >= row.target_value
        : actual <= row.target_value;
    }
    return {
      campaign_id: row.campaign_id,
      metric_name: row.metric_name,
      target_value: row.target_value,
      unit: row.unit,
      actual_value: actual,
      is_met,
    };
  });
}
