'use client';

import { useEffect, useRef } from 'react';

/**
 * Calls `refresh` every `intervalMs` while `enabled`, but only while the tab
 * is visible: a hidden tab doesn't poll the database. On returning to the
 * tab, refreshes at once if the data is older than one interval.
 */
export function useAutoRefresh(
  enabled: boolean,
  refresh: () => void,
  lastFetchedAt: Date | null,
  intervalMs: number
) {
  // Refs so the interval isn't torn down and restarted on every render.
  const refreshRef = useRef(refresh);
  const lastFetchedRef = useRef(lastFetchedAt);
  useEffect(() => {
    refreshRef.current = refresh;
    lastFetchedRef.current = lastFetchedAt;
  });

  useEffect(() => {
    if (!enabled) return;
    const isStale = () => !lastFetchedRef.current || Date.now() - lastFetchedRef.current.getTime() >= intervalMs;

    const id = setInterval(() => {
      if (document.visibilityState === 'visible') refreshRef.current();
    }, intervalMs);

    function onVisibility() {
      if (document.visibilityState === 'visible' && isStale()) refreshRef.current();
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, intervalMs]);
}
