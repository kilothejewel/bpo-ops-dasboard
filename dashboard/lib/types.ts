export type UserRole = 'management' | 'standard';

export interface UserSession {
  userId?: string;
  userName?: string;
  role: UserRole;
  campaignId?: string; // Assigned campaign for standard role
}

export interface MockUserProfile {
  id: string;
  name: string;
  title: string;
  role: UserRole;
  campaignId?: string;
  campaignName?: string;
}

export interface CampaignOption {
  campaign_id: string;
  campaign_name: string;
  client_name: string;
}

export interface KPIOverviewStats {
  total_interactions: number;
  total_calls: number;
  total_emails: number;
  total_tickets: number;
  total_chats: number;
  
  // Phone SLA
  calls_under_60s_count: number;
  total_calls_evaluated: number;
  overall_phone_sla_pct: number;
  target_phone_sla_pct: number | null;
  
  // CSAT
  csat_satisfied_count: number;
  csat_total_responses: number;
  overall_csat_pct: number;
  target_csat_pct: number | null;

  // Email averages
  avg_email_first_reply_mins: number;
  avg_email_resolution_mins: number;
}

// One row per ISO week, aggregated across whatever campaign scope the
// session/query resolved to (a single campaign, or summed across all
// campaigns visible to a management session).
export interface WeeklyKpiTrend {
  year: number;
  week: number;
  week_name: string;
  week_start_date: string;
  total_interactions: number;
  call_volume: number;
  email_volume: number;
  ticket_volume: number;
  chat_volume: number;
  actual_phone_sla_pct: number | null;
  target_phone_sla_pct: number | null;
  actual_csat_pct: number | null;
  target_csat_pct: number | null;
}

/** Latest complete ISO week vs the week before it, within the session's
 * campaign scope. Independent of the selected range. */
export interface WeekOverWeek {
  current: WeekSnapshot;
  previous: WeekSnapshot;
  /** Weeks after `current` that were skipped because they are partial. */
  skippedPartialWeek: string | null;
}

export interface WeekSnapshot {
  week_name: string;
  total_interactions: number;
  phone_sla_pct: number | null;
  csat_pct: number | null;
  email_first_reply_mins: number | null;
  days_with_data: number;
}

export interface AgentLeaderboardRow {
  agent_id: string;
  agent_name: string;
  role: string;
  interactions: number;
  calls_evaluated: number;
  phone_sla_pct: number | null;
  avg_answer_seconds: number | null;
  csat_responses: number;
  csat_pct: number | null;
}

export interface InteractionRecord {
  interaction_id: string;
  campaign_id: string;
  campaign_name: string;
  client_name: string;
  agent_id: string;
  agent_name: string;
  channel: string;
  opened_at: string;
  first_response_at: string | null;
  resolved_at: string | null;
  csat_score: number | null;
  call_duration_seconds: number | null;
  answer_time_seconds: number | null;
  first_reply_time_minutes: number | null;
  resolution_time_minutes: number | null;
  is_call_answered_under_1min: number | null;
}

// Week window, always counted back from the most recent week in the data
// (the demo dataset is a fixed historical window, so "today" isn't useful).
export type DateRange = 'all' | 'last4' | 'latest';

export type InteractionSort = 'opened_desc' | 'opened_asc' | 'delay_asc' | 'delay_desc' | 'csat_desc' | 'csat_asc';

export interface PaginatedInteractions {
  rows: InteractionRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CampaignTarget {
  campaign_id: string;
  metric_name: string;
  target_value: number;
  unit: string;
  // Live actual value for this metric, aggregated across all available
  // weeks for the campaign (same computation as weekly_campaign_kpis).
  // Null when there's no data yet to evaluate against (e.g. no phone calls
  // evaluated) — deliberately distinct from "met"/"missed".
  actual_value: number | null;
  // Null (not false) when actual_value is null — "no data" is not "missed".
  is_met: boolean | null;
}

export interface DashboardMeta {
  nextVersion: string;
  dbt: import('./dbt-status').DbtStatus;
}
