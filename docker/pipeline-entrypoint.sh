#!/bin/sh
set -eu

echo "==> Bronze: generating synthetic data into the raw schema"
python scripts/generate_data.py

echo "==> Silver/Gold: dbt build (models + data tests)"
cd dbt_bpo
# Artifacts (run_results.json) go to a volume shared read-only with the
# dashboard, which reads them for its live "dbt tests" status.
dbt build --profiles-dir . --target-path "${DBT_TARGET_DIR:-target}"
