import random
import uuid
from datetime import datetime, timedelta
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from faker import Faker

fake = Faker()
random.seed(42)

# Database connection settings
DB_CONFIG = {
    "dbname": "bpo_db",
    "user": "postgres",
    "password": "postgres",
    "host": "localhost",
    "port": 5432
}

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)

def setup_raw_schema(conn):
    with conn.cursor() as cur:
        cur.execute("CREATE SCHEMA IF NOT EXISTS raw;")
        
        # Raw tables definition
        cur.execute("""
            DROP TABLE IF EXISTS raw.raw_interactions CASCADE;
            DROP TABLE IF EXISTS raw.raw_campaign_targets CASCADE;
            DROP TABLE IF EXISTS raw.raw_agents CASCADE;
            DROP TABLE IF EXISTS raw.raw_campaigns CASCADE;
            DROP TABLE IF EXISTS raw.raw_channels CASCADE;

            CREATE TABLE raw.raw_campaigns (
                campaign_id VARCHAR(50) PRIMARY KEY,
                campaign_name VARCHAR(100) NOT NULL,
                client_name VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE raw.raw_agents (
                agent_id VARCHAR(50) PRIMARY KEY,
                agent_name VARCHAR(100) NOT NULL,
                role VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE raw.raw_channels (
                channel_id VARCHAR(50) PRIMARY KEY,
                channel_name VARCHAR(50) NOT NULL
            );

            CREATE TABLE raw.raw_campaign_targets (
                campaign_id VARCHAR(50) NOT NULL,
                metric_name VARCHAR(100) NOT NULL,
                target_value NUMERIC(10, 2) NOT NULL,
                unit VARCHAR(20) NOT NULL,
                PRIMARY KEY (campaign_id, metric_name)
            );

            CREATE TABLE raw.raw_interactions (
                interaction_id VARCHAR(100),
                campaign_id VARCHAR(50),
                agent_id VARCHAR(50),
                channel VARCHAR(50),
                opened_at TIMESTAMP,
                first_response_at TIMESTAMP,
                resolved_at TIMESTAMP,
                csat_score INT,
                call_duration_seconds INT,
                created_in_source_at TIMESTAMP
            );
        """)
    conn.commit()

def generate_and_load_data():
    conn = get_db_connection()
    setup_raw_schema(conn)
    
    # 1. Campaigns (4 campaigns mirroring real client setup)
    campaigns = [
        ("CMP-101", "FinTechCare", "Apex Financial Services"),
        ("CMP-102", "HealthLine", "BioHealth Systems"),
        ("CMP-103", "RetailPulse", "Omnichannel Retail Co"),
        ("CMP-104", "TechAssist", "CloudScale SaaS")
    ]
    
    # 2. Channels
    channels = [
        ("CH-01", "phone"),
        ("CH-02", "email"),
        ("CH-03", "ticket"),
        ("CH-04", "chat")
    ]
    
    # 3. Agents (20 synthetic agents)
    roles = ["Tier 1 Support Agent", "Tier 2 Technical Specialist", "Customer Care Advocate", "Shift Supervisor"]
    agents = [(f"AGT-{100 + i}", fake.name(), random.choice(roles)) for i in range(1, 21)]
    
    # 4. Campaign Targets (Dynamic SLAs per campaign)
    # SLA Confirmed Targets: Calls answered <1m target = 90%, CSAT target = 45%
    targets = [
        # FinTechCare
        ("CMP-101", "calls_answered_under_1min_pct", 90.00, "%"),
        ("CMP-101", "csat_score_pct", 45.00, "%"),
        ("CMP-101", "email_first_reply_mins", 15.00, "minutes"),
        ("CMP-101", "email_resolution_mins", 120.00, "minutes"),
        # HealthLine
        ("CMP-102", "calls_answered_under_1min_pct", 90.00, "%"),
        ("CMP-102", "csat_score_pct", 45.00, "%"),
        ("CMP-102", "email_first_reply_mins", 20.00, "minutes"),
        ("CMP-102", "email_resolution_mins", 180.00, "minutes"),
        # RetailPulse
        ("CMP-103", "calls_answered_under_1min_pct", 90.00, "%"),
        ("CMP-103", "csat_score_pct", 45.00, "%"),
        ("CMP-103", "email_first_reply_mins", 30.00, "minutes"),
        ("CMP-103", "email_resolution_mins", 240.00, "minutes"),
        # TechAssist
        ("CMP-104", "calls_answered_under_1min_pct", 90.00, "%"),
        ("CMP-104", "csat_score_pct", 45.00, "%"),
        ("CMP-104", "email_first_reply_mins", 10.00, "minutes"),
        ("CMP-104", "email_resolution_mins", 90.00, "minutes"),
    ]

    # Insert static lookup data
    with conn.cursor() as cur:
        execute_values(cur, "INSERT INTO raw.raw_campaigns (campaign_id, campaign_name, client_name) VALUES %s", campaigns)
        execute_values(cur, "INSERT INTO raw.raw_channels (channel_id, channel_name) VALUES %s", channels)
        execute_values(cur, "INSERT INTO raw.raw_agents (agent_id, agent_name, role) VALUES %s", agents)
        execute_values(cur, "INSERT INTO raw.raw_campaign_targets (campaign_id, metric_name, target_value, unit) VALUES %s", targets)
    conn.commit()

    # 5. Generate Interactions (~3,600 rows over 8 weeks)
    start_date = datetime(2026, 7, 1, 8, 0, 0)
    end_date = datetime(2026, 8, 31, 18, 0, 0)
    total_days = (end_date - start_date).days

    interactions = []
    channel_list = ["phone", "email", "ticket", "chat"]
    campaign_ids = [c[0] for c in campaigns]
    agent_ids = [a[0] for a in agents]

    interaction_count = 3600

    for i in range(interaction_count):
        interaction_id = f"INT-{100000 + i}"
        campaign_id = random.choice(campaign_ids)
        agent_id = random.choice(agent_ids)
        channel = random.choices(channel_list, weights=[0.40, 0.30, 0.15, 0.15])[0]

        # Random timestamp within 8 weeks
        offset_days = random.randint(0, total_days)
        offset_seconds = random.randint(0, 3600 * 10)
        opened_at = start_date + timedelta(days=offset_days, seconds=offset_seconds)
        created_in_source_at = opened_at + timedelta(seconds=random.randint(0, 10))

        first_response_at = None
        resolved_at = None
        csat_score = None
        call_duration_seconds = None

        if channel == "phone":
            # Confirmed KPI: Calls answered within 1 min = ~90%
            if random.random() < 0.905:
                answer_delay = random.randint(8, 58)
            else:
                answer_delay = random.randint(65, 320)
            
            first_response_at = opened_at + timedelta(seconds=answer_delay)
            call_duration_seconds = random.randint(60, 900)
            resolved_at = first_response_at + timedelta(seconds=call_duration_seconds)

        elif channel == "email":
            # Email reply time: average 15-25 mins
            reply_delay_mins = random.uniform(3, 45)
            first_response_at = opened_at + timedelta(minutes=reply_delay_mins)
            resolution_delay_mins = reply_delay_mins + random.uniform(15, 180)
            resolved_at = opened_at + timedelta(minutes=resolution_delay_mins)

        elif channel == "ticket":
            first_reply_mins = random.uniform(10, 90)
            first_response_at = opened_at + timedelta(minutes=first_reply_mins)
            resolved_at = first_response_at + timedelta(hours=random.uniform(1, 48))

        elif channel == "chat":
            reply_delay_secs = random.randint(5, 45)
            first_response_at = opened_at + timedelta(seconds=reply_delay_secs)
            chat_duration = random.randint(120, 1200)
            resolved_at = first_response_at + timedelta(seconds=chat_duration)

        # CSAT Calibration: Confirmed KPI ~45% CSAT score
        # For interactions with CSAT ratings (~70% response rate):
        # 45% positive (scores 4 or 5), 55% neutral/negative (scores 1, 2, 3)
        if resolved_at and random.random() < 0.70:
            if random.random() < 0.45:
                csat_score = random.choice([4, 5])
            else:
                csat_score = random.choice([1, 2, 3])

        interactions.append((
            interaction_id,
            campaign_id,
            agent_id,
            channel,
            opened_at,
            first_response_at,
            resolved_at,
            csat_score,
            call_duration_seconds,
            created_in_source_at
        ))

    # Add intentional messiness (data quality edge cases for dbt tests)
    # 1. Duplicates (5 duplicate rows)
    duplicates = random.sample(interactions, 5)
    interactions.extend(duplicates)

    # 2. Late arriving records (2 records with opened_at 3 weeks ago but created_in_source_at today)
    today = datetime.now()
    late_record_1 = (
        "INT-999001",
        "CMP-101",
        "AGT-101",
        "phone",
        start_date + timedelta(days=5),
        start_date + timedelta(days=5, seconds=25),
        start_date + timedelta(days=5, seconds=300),
        5,
        275,
        today
    )
    late_record_2 = (
        "INT-999002",
        "CMP-102",
        "AGT-102",
        "email",
        start_date + timedelta(days=7),
        start_date + timedelta(days=7, minutes=12),
        start_date + timedelta(days=7, minutes=90),
        4,
        None,
        today
    )
    interactions.extend([late_record_1, late_record_2])

    # Batch insert into raw_interactions
    insert_sql = """
        INSERT INTO raw.raw_interactions (
            interaction_id, campaign_id, agent_id, channel,
            opened_at, first_response_at, resolved_at,
            csat_score, call_duration_seconds, created_in_source_at
        ) VALUES %s
    """
    with conn.cursor() as cur:
        execute_values(cur, insert_sql, interactions)
    conn.commit()
    conn.close()

    print(f"✅ Successfully generated and loaded {len(interactions)} raw interaction records into PostgreSQL 'raw' schema!")

if __name__ == "__main__":
    generate_and_load_data()
