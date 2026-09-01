SELECT
    campaign_id,
    metric_name,
    target_value,
    unit
FROM {{ ref('stg_campaign_targets') }}
