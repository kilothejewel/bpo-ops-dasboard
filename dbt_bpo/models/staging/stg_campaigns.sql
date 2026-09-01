SELECT
    campaign_id,
    TRIM(campaign_name) AS campaign_name,
    TRIM(client_name) AS client_name,
    created_at
FROM raw.raw_campaigns
