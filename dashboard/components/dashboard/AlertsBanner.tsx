'use client';

import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react';

import type { Breach } from '@/lib/alerts';
import { describeBreach } from '@/lib/alerts';

const COLLAPSED_COUNT = 3;

interface AlertsBannerProps {
  breaches: Breach[];
  rangeLabel: string;
}

/** Below-target alerts for the campaigns in view. Hidden when nothing is
 * breached; dismissible for the current page view. */
export default function AlertsBanner({ breaches, rangeLabel }: AlertsBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  // Re-show automatically if the set of breaches changes after a dismiss.
  const key = breaches.map((b) => `${b.campaignId}:${b.metric}`).join('|');
  if (breaches.length === 0 || dismissedKey === key) return null;

  const shown = expanded ? breaches : breaches.slice(0, COLLAPSED_COUNT);
  const hiddenCount = breaches.length - shown.length;

  return (
    <section role="status" aria-label="Below-target alerts" className="rounded-xl border border-red-900/70 bg-red-950/25 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-red-200">
              {breaches.length} target{breaches.length === 1 ? '' : 's'} below goal
              <span className="ml-2 font-mono text-[11px] font-normal text-red-300/70">{rangeLabel}</span>
            </h2>
            <ul className="mt-1.5 space-y-1 text-xs">
              {shown.map((b) => (
                <li key={`${b.campaignId}-${b.metric}`} className="font-mono text-slate-300">
                  <span className="text-slate-100">{b.campaignId}</span>{' '}
                  <span className="text-slate-400 font-sans">{b.campaignName}</span> · {describeBreach(b)}
                </li>
              ))}
            </ul>
            {breaches.length > COLLAPSED_COUNT && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="mt-1.5 text-[11px] font-mono text-red-300 hover:text-red-200 inline-flex items-center gap-1"
              >
                {expanded ? (
                  <>
                    Show fewer <ChevronUp className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    Show {hiddenCount} more <ChevronDown className="w-3 h-3" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        <button
          onClick={() => setDismissedKey(key)}
          aria-label="Dismiss alerts"
          title="Dismiss until the alerts change"
          className="text-red-300/70 hover:text-red-200 shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}
