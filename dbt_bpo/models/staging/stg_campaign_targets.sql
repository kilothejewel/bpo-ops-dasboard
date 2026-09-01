SELECT
    campaign_id,
    TRIM(metric_name) AS metric_name,
    target_value,
    TRIM(unit) AS unit
FROM raw.raw_campaign_targets
