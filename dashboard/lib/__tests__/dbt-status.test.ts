import { describe, expect, it } from 'vitest';
import { summarizeRunResults } from '@/lib/dbt-status';

const runResults = (results: { unique_id: string; status: string }[], which = 'build') => ({
  metadata: { dbt_version: '1.12.5', generated_at: '2026-10-08T12:01:28Z' },
  args: { which },
  results,
});

describe('summarizeRunResults', () => {
  it('counts tests and models by status', () => {
    const s = summarizeRunResults(
      runResults([
        { unique_id: 'model.dbt_bpo.a', status: 'success' },
        { unique_id: 'model.dbt_bpo.b', status: 'error' },
        { unique_id: 'test.dbt_bpo.t1', status: 'pass' },
        { unique_id: 'test.dbt_bpo.t2', status: 'pass' },
        { unique_id: 'test.dbt_bpo.t3', status: 'fail' },
        { unique_id: 'test.dbt_bpo.t4', status: 'warn' },
        { unique_id: 'test.dbt_bpo.t5', status: 'skipped' },
        { unique_id: 'seed.dbt_bpo.s', status: 'success' },
      ])
    );
    expect(s.available).toBe(true);
    expect(s.command).toBe('build');
    expect(s.dbtVersion).toBe('1.12.5');
    expect(s.tests).toEqual({ total: 5, passed: 2, failed: 1, warned: 1, other: 1 });
    expect(s.models).toEqual({ total: 2, succeeded: 1, failed: 1 });
  });

  it('reports zero tests after a plain `dbt run`', () => {
    const s = summarizeRunResults(runResults([{ unique_id: 'model.dbt_bpo.a', status: 'success' }], 'run'));
    expect(s.tests.total).toBe(0);
    expect(s.command).toBe('run');
  });

  it.each([null, {}, { results: 'nope' }, 'garbage'])('treats %j as unavailable', (raw) => {
    expect(summarizeRunResults(raw).available).toBe(false);
  });
});
