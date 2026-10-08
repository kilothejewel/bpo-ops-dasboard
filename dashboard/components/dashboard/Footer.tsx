export default function Footer() {
  return (
    <footer className="border-t border-slate-800/70 bg-surface-0 mt-auto px-4 sm:px-6 py-3 text-xs text-slate-500">
      <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-mono text-[11px] flex-wrap">
          <span className="text-slate-400 uppercase tracking-wider text-[10px]">Medallion Lineage:</span>
          <div className="flex items-center gap-1.5 bg-surface-1 border border-slate-800 px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span className="text-slate-300">Bronze Ingest</span>
          </div>
          <span className="text-slate-600">→</span>
          <div className="flex items-center gap-1.5 bg-surface-1 border border-slate-800 px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            <span className="text-slate-300">Silver Cleanse</span>
          </div>
          <span className="text-slate-600">→</span>
          <div className="flex items-center gap-1.5 bg-surface-1 border border-slate-800 px-2 py-0.5 rounded ring-1 ring-emerald-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-slate-100 font-medium">Gold Marts</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500">
          <span>
            Target: <strong className="text-slate-300 font-normal">local · postgres</strong>
          </span>
          <span>
            Runtime: <strong className="text-slate-300 font-normal">Next.js 16.3.4</strong>
          </span>
          <span>
            dbt: <strong className="text-slate-300 font-normal">1.12.3</strong>
          </span>
        </div>
      </div>
    </footer>
  );
}
