export type UserRole = 'management' | 'standard';

export interface UserSession {
  role: UserRole;
  campaignId?: string; // Assigned campaign for standard role
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
  target_phone_sla_pct: number;
  
  // CSAT
  csat_satisfied_count: number;
  csat_total_responses: number;
  overall_csat_pct: number;
  target_csat_pct: number;

  // Email averages
  avg_email_first_reply_mins: number;
  avg_email_resolution_mins: number;
}

export interface WeeklyKpiTrend {
  campaign_id: string;
  campaign_name: string;
  year: number;
  week: number;
  week_name: string;
  week_start_date: string;
  total_interactions: number;
  call_volume: number;
  email_volume: number;
  ticket_volume: number;
  chat_volume: number;
  actual_phone_sla_pct: number;
  target_phone_sla_pct: number;
  is_phone_sla_met: number;
  actual_csat_pct: number;
  target_csat_pct: number;
  avg_email_first_reply_mins: number;
  avg_email_resolution_mins: number;
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

export interface CampaignTarget {
  campaign_id: string;
  metric_name: string;
  target_value: number;
  unit: string;
}
