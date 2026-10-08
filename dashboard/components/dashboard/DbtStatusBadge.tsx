import type { DashboardMeta } from '@/lib/types';

/** Live dbt test status from run_results.json. Each state carries a text
 * label, so status is never conveyed by color alone. */
export default function DbtStatusBadge({ meta }: { meta: DashboardMeta | null }) {
  const dbt = meta?.dbt;
  let tone = 'text-slate-400';
  let dot = 'bg-slate-500';
  let label = 'dbt tests: …';

  if (dbt && !dbt.available) {
    label = 'dbt tests: no run found';
  } else if (dbt && dbt.tests.total === 0) {
    label = `dbt tests: not run (last: dbt ${dbt.command ?? '?'})`;
  } else if (dbt && dbt.tests.failed > 0) {
    tone = 'text-red-400';
    dot = 'bg-red-400';
    label = `dbt tests: ${dbt.tests.failed} failing of ${dbt.tests.total}`;
  } else if (dbt) {
    tone = 'text-emerald-400';
    dot = 'bg-emerald-400';
    label = `dbt tests: ${dbt.tests.passed}/${dbt.tests.total} passing`;
    if (dbt.tests.warned) label += ` · ${dbt.tests.warned} warn`;
  }

  const title = dbt?.available
    ? `Last dbt ${dbt.command} at ${dbt.generatedAt ? new Date(dbt.generatedAt).toLocaleString() : 'unknown time'} · ` +
      `${dbt.models.succeeded}/${dbt.models.total} models built`
    : 'Reads dbt_bpo/target/run_results.json (set DBT_TARGET_DIR to override)';

  return (
    <span className={`${tone} font-medium flex items-center gap-1`} title={title}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} /> {label}
    </span>
  );
}
