SELECT
    agent_id,
    TRIM(agent_name) AS agent_name,
    TRIM(role) AS role,
    created_at
FROM raw.raw_agents
