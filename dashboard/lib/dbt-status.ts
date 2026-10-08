import { promises as fs } from 'fs';
import path from 'path';

/**
 * Pipeline health as reported by dbt itself, read from the
 * target/run_results.json artifact written by the most recent dbt command.
 * Replaces hardcoded "48/48 passing" text: if the artifact is missing or
 * the last command ran no tests, the UI says so instead of claiming a pass.
 */
export interface DbtStatus {
  available: boolean;
  /** dbt sub-command of the last invocation, e.g. "build", "test", "run". */
  command: string | null;
  dbtVersion: string | null;
  generatedAt: string | null;
  tests: { total: number; passed: number; failed: number; warned: number; other: number };
  models: { total: number; succeeded: number; failed: number };
}

const UNAVAILABLE: DbtStatus = {
  available: false,
  command: null,
  dbtVersion: null,
  generatedAt: null,
  tests: { total: 0, passed: 0, failed: 0, warned: 0, other: 0 },
  models: { total: 0, succeeded: 0, failed: 0 },
};

interface RunResults {
  metadata?: { dbt_version?: string; generated_at?: string };
  args?: { which?: string };
  results?: { unique_id?: string; status?: string }[];
}

export function summarizeRunResults(raw: unknown): DbtStatus {
  const r = raw as RunResults;
  if (!r || !Array.isArray(r.results)) return UNAVAILABLE;

  const tests = { total: 0, passed: 0, failed: 0, warned: 0, other: 0 };
  const models = { total: 0, succeeded: 0, failed: 0 };
  for (const res of r.results) {
    const kind = res.unique_id?.split('.')[0];
    if (kind === 'test') {
      tests.total++;
      if (res.status === 'pass') tests.passed++;
      else if (res.status === 'fail' || res.status === 'error') tests.failed++;
      else if (res.status === 'warn') tests.warned++;
      else tests.other++; // e.g. skipped
    } else if (kind === 'model') {
      models.total++;
      if (res.status === 'success') models.succeeded++;
      else if (res.status === 'error') models.failed++;
    }
  }

  return {
    available: true,
    command: r.args?.which ?? null,
    dbtVersion: r.metadata?.dbt_version ?? null,
    generatedAt: r.metadata?.generated_at ?? null,
    tests,
    models,
  };
}

/** Directory holding dbt's artifacts. Override with DBT_TARGET_DIR when the
 * dashboard isn't run from the repo checkout (e.g. a container). */
export function dbtTargetDir(): string {
  return process.env.DBT_TARGET_DIR || path.join(process.cwd(), '..', 'dbt_bpo', 'target');
}

export async function readDbtStatus(): Promise<DbtStatus> {
  try {
    const file = await fs.readFile(path.join(dbtTargetDir(), 'run_results.json'), 'utf8');
    return summarizeRunResults(JSON.parse(file));
  } catch {
    return UNAVAILABLE;
  }
}
