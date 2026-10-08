'use client';

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'bpo.interactions.hiddenColumns';
const CHANGE_EVENT = 'bpo:hidden-columns';

// Per-browser preference only. Storage can be unavailable (private mode,
// blocked site data), so every access is guarded; without storage the
// choice lives in memory for this page view.
let memoryValue = '[]';

function read(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? '[]';
  } catch {
    return memoryValue;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function parse(raw: string): string[] {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/** Hidden column IDs, remembered in localStorage. Stores what's hidden (not
 * what's shown) so columns added later default to visible. The server
 * snapshot is "nothing hidden", so SSR and first paint always agree. */
export function useHiddenColumns() {
  const raw = useSyncExternalStore(subscribe, read, () => '[]');
  const hidden = parse(raw);

  const toggle = useCallback((id: string) => {
    const current = parse(read());
    const next = current.includes(id) ? current.filter((c) => c !== id) : [...current, id];
    memoryValue = JSON.stringify(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, memoryValue);
    } catch {
      // Storage unavailable: falls back to memoryValue (not persisted).
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { hidden, toggle };
}
