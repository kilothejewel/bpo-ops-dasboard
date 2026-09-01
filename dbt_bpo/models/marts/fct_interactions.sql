SELECT
    i.interaction_id,
    i.campaign_id,
    i.agent_id,
    i.channel,
    i.opened_at,
    i.first_response_at,
    i.resolved_at,
    i.csat_score,
    i.call_duration_seconds,
    i.date_key,
    i.answer_time_seconds,
    i.first_reply_time_minutes,
    i.resolution_time_minutes,
    CASE 
        WHEN i.channel = 'phone' AND i.answer_time_seconds IS NOT NULL THEN
            CASE WHEN i.answer_time_seconds <= 60 THEN 1 ELSE 0 END
        ELSE NULL
    END AS is_call_answered_under_1min,
    CASE
        WHEN i.csat_score IS NOT NULL THEN
            CASE WHEN i.csat_score >= 4 THEN 1 ELSE 0 END
        ELSE NULL
    END AS is_csat_satisfied
FROM {{ ref('stg_interactions') }} i
