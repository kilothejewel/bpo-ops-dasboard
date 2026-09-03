-- Singular test: recomputes phone SLA adherence directly from fct_interactions
-- (bypassing weekly_campaign_kpis entirely) and asserts it matches what the
-- mart reports, per campaign/week, within rounding tolerance.
--
-- This automates the manual RAW-vs-DBT_MARTS reconciliation query documented
-- in the README so it runs automatically on every `dbt test` instead of
-- relying on someone to run it by hand.
--
-- A dbt test "fails" if this query returns any rows, so we select only the
-- mismatches.

WITH recomputed AS (
    SELECT
        f.campaign_id,
        d.year,
        d.week,
        COUNT(CASE WHEN f.channel = 'phone' AND f.is_call_answered_under_1min IS NOT NULL THEN 1 END) AS total_calls_evaluated,
        SUM(f.is_call_answered_under_1min) AS calls_under_60s,
        ROUND(
            (SUM(f.is_call_answered_under_1min)::NUMERIC /
            NULLIF(COUNT(CASE WHEN f.channel = 'phone' AND f.is_call_answered_under_1min IS NOT NULL THEN 1 END), 0)) * 100.0,
            2
        ) AS recomputed_phone_sla_pct
    FROM {{ ref('fct_interactions') }} f
    JOIN {{ ref('dim_date') }} d ON f.date_key = d.date_key
    GROUP BY f.campaign_id, d.year, d.week
)

SELECT
    k.campaign_id,
    k.year,
    k.week,
    k.total_calls_evaluated AS mart_total_calls_evaluated,
    r.total_calls_evaluated AS recomputed_total_calls_evaluated,
    k.actual_phone_sla_pct AS mart_phone_sla_pct,
    r.recomputed_phone_sla_pct
FROM {{ ref('weekly_campaign_kpis') }} k
JOIN recomputed r
    ON k.campaign_id = r.campaign_id
    AND k.year = r.year
    AND k.week = r.week
WHERE
    k.total_calls_evaluated IS DISTINCT FROM r.total_calls_evaluated
    OR k.actual_phone_sla_pct IS DISTINCT FROM r.recomputed_phone_sla_pct
