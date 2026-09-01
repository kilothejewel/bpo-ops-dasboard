SELECT
    channel_id,
    LOWER(TRIM(channel_name)) AS channel_name
FROM raw.raw_channels
