WITH date_series AS (
    SELECT 
        date_day::DATE AS full_date
    FROM generate_series(
        '2026-06-01'::DATE, 
        '2026-12-31'::DATE, 
        '1 day'::INTERVAL
    ) AS date_day
)
SELECT
    TO_CHAR(full_date, 'YYYYMMDD')::INT AS date_key,
    full_date AS date,
    EXTRACT(WEEK FROM full_date)::INT AS week,
    EXTRACT(MONTH FROM full_date)::INT AS month,
    EXTRACT(YEAR FROM full_date)::INT AS year,
    TO_CHAR(full_date, 'YYYY-"W"IW') AS week_name,
    TO_CHAR(full_date, 'Month') AS month_name
FROM date_series
