'use client';

import { useEffect, useRef, useState } from 'react';
import { Columns3, Check } from 'lucide-react';

import type { InteractionColumn } from './interaction-columns';

interface ColumnMenuProps {
  columns: InteractionColumn[];
  hidden: string[];
  onToggle: (id: string) => void;
}

export default function ColumnMenu({ columns, hidden, onToggle }: ColumnMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const shownCount = columns.filter((c) => !hidden.includes(c.id)).length;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        title="Show or hide columns"
        className="h-8 px-2.5 rounded-lg border border-slate-800 bg-surface-0 text-slate-400 hover:text-sky-300 hover:border-slate-700 text-xs font-mono flex items-center gap-1.5 transition"
      >
        <Columns3 className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Columns</span>
        <span className="text-[10px] text-slate-500 tabular-nums">
          {shownCount}/{columns.length}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-52 panel rounded-lg shadow-2xl z-30 py-1" role="group" aria-label="Visible columns">
          {columns.map((col) => {
            const visible = !hidden.includes(col.id);
            return (
              <label
                key={col.id}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs ${
                  col.required ? 'text-slate-500 cursor-not-allowed' : 'text-slate-200 hover:bg-slate-800/60 cursor-pointer'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={visible}
                  disabled={col.required}
                  onChange={() => onToggle(col.id)}
                />
                <span
                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center peer-focus-visible:ring-2 peer-focus-visible:ring-sky-500 ${
                    visible ? 'bg-sky-600 border-sky-500' : 'border-slate-600'
                  }`}
                >
                  {visible && <Check className="w-2.5 h-2.5 text-white" />}
                </span>
                {col.header}
                {col.required && <span className="ml-auto text-[10px] font-mono">required</span>}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
