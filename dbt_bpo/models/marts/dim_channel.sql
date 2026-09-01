SELECT
    channel_id,
    channel_name
FROM {{ ref('stg_channels') }}
