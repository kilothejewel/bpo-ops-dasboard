'use client';

import { useEffect, useRef, useState } from 'react';
import { Layers, RefreshCw, Download, Share2 } from 'lucide-react';

import type { MockUserProfile } from '@/lib/types';
import { initials } from '@/lib/format';
import { DEFAULT_MANAGEMENT_USER_ID } from '@/hooks/useDashboardData';

interface HeaderProps {
  breadcrumbLabel: string;
  loading: boolean;
  syncAgoLabel: string;
  weekRangeLabel: string;
  personas: MockUserProfile[];
  currentUserId: string;
  currentPersona: MockUserProfile | undefined;
  handleRefresh: () => void;
  handlePersonaSelect: (userId: string) => void;
}

export default function Header({
  breadcrumbLabel,
  loading,
  syncAgoLabel,
  weekRangeLabel,
  personas,
  currentUserId,
  currentPersona,
  handleRefresh,
  handlePersonaSelect,
}: HeaderProps) {
  const [personaMenuOpen, setPersonaMenuOpen] = useState(false);
  const personaMenuRef = useRef<HTMLDivElement>(null);
  const standardPersonas = personas.filter((p) => p.role === 'standard');

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (personaMenuRef.current && !personaMenuRef.current.contains(e.target as Node)) {
        setPersonaMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const selectPersona = (userId: string) => {
    setPersonaMenuOpen(false);
    handlePersonaSelect(userId);
  };

  return (
    <header className="border-b border-slate-800/80 bg-surface-1 sticky top-0 z-40 px-4 sm:px-6 py-2.5">
      <div className="max-w-[1720px] mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="h-7 w-7 shrink-0 rounded-md bg-surface-0 border border-slate-800 flex items-center justify-center text-sky-400">
            <Layers className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 text-xs min-w-0">
            <span className="font-medium text-slate-400 truncate">Acme Operations</span>
            <span className="text-slate-600 font-mono">/</span>
            <span className="font-medium text-slate-100 truncate">{breadcrumbLabel}</span>
            <span className="hidden sm:inline-flex ml-2 font-mono text-[10px] px-2 py-0.5 rounded-full bg-sky-950/70 border border-sky-800/60 text-sky-300 shrink-0">
              dbt · gold_layer
            </span>
          </div>
          <div className="h-4 w-px bg-slate-800 hidden md:block" />
          <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/40 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>
              {loading ? 'Syncing' : 'Sync idle'} · <span className="text-slate-300">{syncAgoLabel}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden lg:flex items-center bg-surface-0 border border-slate-800/90 rounded-lg p-0.5 text-xs font-mono">
            <button
              disabled
              title="Only the demo dataset's weekly window is available"
              className="px-2.5 py-1 rounded-md text-slate-600 cursor-not-allowed"
            >
              Last 7d
            </button>
            <button className="px-2.5 py-1 rounded-md bg-surface-1 border border-sky-500/60 text-sky-400 font-semibold">
              {weekRangeLabel}
            </button>
            <button
              disabled
              title="Only the demo dataset's weekly window is available"
              className="px-2.5 py-1 rounded-md text-slate-600 cursor-not-allowed"
            >
              YTD
            </button>
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh mart state"
            className="h-7 w-7 rounded-lg border border-slate-800 bg-surface-0 hover:bg-slate-800 text-slate-400 hover:text-sky-400 flex items-center justify-center transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          </button>

          <div className="hidden sm:flex items-center gap-1.5 border-l border-slate-800 pl-3">
            <button className="h-7 px-2.5 rounded-lg border border-sky-900/60 bg-surface-0 hover:border-sky-500/60 text-xs font-medium flex items-center gap-1.5 transition">
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-slate-200">Export</span>
            </button>
            <button className="h-7 px-2.5 rounded-lg bg-surface-0 border border-sky-500 hover:border-sky-400 text-xs font-semibold flex items-center gap-1.5 transition">
              <Share2 className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-sky-300">Share</span>
            </button>
          </div>

          {/* Persona switcher */}
          <div className="relative pl-1" ref={personaMenuRef}>
            <button
              onClick={() => setPersonaMenuOpen((v) => !v)}
              disabled={loading}
              className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-600 to-sky-400 text-[10px] font-mono font-semibold text-surface-0 flex items-center justify-center ring-1 ring-sky-500/40 disabled:opacity-50"
              title={currentPersona ? `${currentPersona.name} — ${currentPersona.title}` : 'Loading session'}
            >
              {initials(currentPersona?.name)}
            </button>
            {personaMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 panel rounded-lg overflow-hidden shadow-2xl z-50">
                <div className="px-3 py-2 border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500 font-mono">
                  Switch persona
                </div>
                <button
                  onClick={() => selectPersona(DEFAULT_MANAGEMENT_USER_ID)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-800/60 transition flex items-center justify-between ${
                    currentUserId === DEFAULT_MANAGEMENT_USER_ID ? 'bg-slate-800/40' : ''
                  }`}
                >
                  <span>
                    <span className="text-slate-100 font-medium block">
                      {personas.find((p) => p.id === DEFAULT_MANAGEMENT_USER_ID)?.name || 'Sarah Chen'}
                    </span>
                    <span className="text-slate-500 text-[11px]">Operations Director · Management</span>
                  </span>
                </button>
                <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-slate-500 font-mono border-t border-slate-800/70">
                  Campaign leads (Standard)
                </div>
                {standardPersonas.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectPersona(p.id)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-800/60 transition ${
                      currentUserId === p.id ? 'bg-slate-800/40' : ''
                    }`}
                  >
                    <span className="text-slate-100 font-medium block">{p.name}</span>
                    <span className="text-slate-500 text-[11px]">{p.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
