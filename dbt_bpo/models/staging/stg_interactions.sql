WITH raw_deduped AS (
    SELECT 
        interaction_id,
        campaign_id,
        agent_id,
        LOWER(TRIM(channel)) AS channel,
        opened_at,
        first_response_at,
        resolved_at,
        csat_score,
        call_duration_seconds,
        created_in_source_at,
        ROW_NUMBER() OVER (
            PARTITION BY interaction_id 
            ORDER BY created_in_source_at DESC, opened_at DESC
        ) AS rn
    FROM raw.raw_interactions
)
SELECT
    interaction_id,
    campaign_id,
    agent_id,
    channel,
    opened_at,
    first_response_at,
    resolved_at,
    csat_score,
    call_duration_seconds,
    created_in_source_at,
    TO_CHAR(opened_at, 'YYYYMMDD')::INT AS date_key,
    CASE 
        WHEN first_response_at IS NOT NULL AND opened_at IS NOT NULL 
        THEN ROUND(EXTRACT(EPOCH FROM (first_response_at - opened_at)))
        ELSE NULL 
    END AS answer_time_seconds,
    CASE 
        WHEN first_response_at IS NOT NULL AND opened_at IS NOT NULL 
        THEN ROUND(EXTRACT(EPOCH FROM (first_response_at - opened_at)) / 60.0, 2)
        ELSE NULL 
    END AS first_reply_time_minutes,
    CASE 
        WHEN resolved_at IS NOT NULL AND opened_at IS NOT NULL 
        THEN ROUND(EXTRACT(EPOCH FROM (resolved_at - opened_at)) / 60.0, 2)
        ELSE NULL 
    END AS resolution_time_minutes
FROM raw_deduped
WHERE rn = 1
