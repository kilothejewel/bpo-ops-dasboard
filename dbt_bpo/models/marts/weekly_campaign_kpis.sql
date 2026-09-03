WITH weekly_base AS (
    SELECT
        f.campaign_id,
        d.year,
        d.week,
        d.week_name,
        MIN(d.date) AS week_start_date,
        COUNT(f.interaction_id) AS total_interactions,
        COUNT(CASE WHEN f.channel = 'phone' THEN 1 END) AS call_volume,
        COUNT(CASE WHEN f.channel = 'email' THEN 1 END) AS email_volume,
        COUNT(CASE WHEN f.channel = 'ticket' THEN 1 END) AS ticket_volume,
        COUNT(CASE WHEN f.channel = 'chat' THEN 1 END) AS chat_volume,
        
        -- Calls SLA under 1 min
        SUM(f.is_call_answered_under_1min) AS calls_answered_under_1min_count,
        COUNT(CASE WHEN f.channel = 'phone' AND f.is_call_answered_under_1min IS NOT NULL THEN 1 END) AS total_calls_evaluated,
        
        -- CSAT score
        SUM(f.is_csat_satisfied) AS csat_satisfied_count,
        COUNT(f.is_csat_satisfied) AS csat_total_responses,

        -- Email metrics
        AVG(CASE WHEN f.channel = 'email' THEN f.first_reply_time_minutes END) AS avg_email_first_reply_mins,
        AVG(CASE WHEN f.channel = 'email' THEN f.resolution_time_minutes END) AS avg_email_resolution_mins
    FROM {{ ref('fct_interactions') }} f
    JOIN {{ ref('dim_date') }} d ON f.date_key = d.date_key
    GROUP BY f.campaign_id, d.year, d.week, d.week_name
),

-- Compute rounded percentages once so the displayed value and the SLA-met
weekly_computed AS (
    SELECT
        wb.*,
        ROUND((wb.calls_answered_under_1min_count::NUMERIC / NULLIF(wb.total_calls_evaluated, 0)) * 100.0, 2) AS actual_phone_sla_pct,
        ROUND((wb.csat_satisfied_count::NUMERIC / NULLIF(wb.csat_total_responses, 0)) * 100.0, 2) AS actual_csat_pct,
        ROUND(wb.avg_email_first_reply_mins::NUMERIC, 2) AS rounded_avg_email_first_reply_mins,
        ROUND(wb.avg_email_resolution_mins::NUMERIC, 2) AS rounded_avg_email_resolution_mins
    FROM weekly_base wb
)

SELECT
    wc.campaign_id,
    c.campaign_name,
    c.client_name,
    wc.year,
    wc.week,
    wc.week_name,
    wc.week_start_date,
    wc.total_interactions,
    wc.call_volume,
    wc.email_volume,
    wc.ticket_volume,
    wc.chat_volume,
    
    -- Actual Computed KPIs
    wc.calls_answered_under_1min_count,
    wc.total_calls_evaluated,
    wc.actual_phone_sla_pct,
    t_phone.target_value AS target_phone_sla_pct,
    CASE 
        WHEN t_phone.target_value IS NULL THEN NULL
        WHEN wc.total_calls_evaluated = 0 OR wc.total_calls_evaluated IS NULL THEN NULL
        WHEN wc.actual_phone_sla_pct >= t_phone.target_value THEN 1 
        ELSE 0 
    END AS is_phone_sla_met,

    wc.csat_satisfied_count,
    wc.csat_total_responses,
    wc.actual_csat_pct,
    t_csat.target_value AS target_csat_pct,

    wc.rounded_avg_email_first_reply_mins AS avg_email_first_reply_mins,
    t_email_reply.target_value AS target_email_first_reply_mins,

    wc.rounded_avg_email_resolution_mins AS avg_email_resolution_mins,
    t_email_res.target_value AS target_email_resolution_mins
FROM weekly_computed wc
JOIN {{ ref('dim_campaign') }} c ON wc.campaign_id = c.campaign_id
LEFT JOIN {{ ref('campaign_targets') }} t_phone 
    ON wc.campaign_id = t_phone.campaign_id AND t_phone.metric_name = 'calls_answered_under_1min_pct'
LEFT JOIN {{ ref('campaign_targets') }} t_csat 
    ON wc.campaign_id = t_csat.campaign_id AND t_csat.metric_name = 'csat_score_pct'
LEFT JOIN {{ ref('campaign_targets') }} t_email_reply 
    ON wc.campaign_id = t_email_reply.campaign_id AND t_email_reply.metric_name = 'email_first_reply_mins'
LEFT JOIN {{ ref('campaign_targets') }} t_email_res 
    ON wc.campaign_id = t_email_res.campaign_id AND t_email_res.metric_name = 'email_resolution_mins'
