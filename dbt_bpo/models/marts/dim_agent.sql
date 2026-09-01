SELECT
    agent_id,
    agent_name,
    role
FROM {{ ref('stg_agents') }}
