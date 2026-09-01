SELECT
    campaign_id,
    campaign_name,
    client_name
FROM {{ ref('stg_campaigns') }}
