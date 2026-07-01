'use client';

import { useEffect } from 'react';

/**
 * Requests a Screen Wake Lock for the lifetime of the component.
 * Re-acquires automatically when the tab becomes visible again.
 * Silently no-ops on browsers that don't support the API.
 */
export function useWakeLock() {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;

    let lock: WakeLockSentinel | null = null;

    async function acquire() {
      try {
        lock = await (navigator as Navigator & { wakeLock: { request(type: string): Promise<WakeLockSentinel> } })
          .wakeLock.request('screen');
      } catch {
        // Permission denied or API unavailable — ignore
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') acquire();
    }

    acquire();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      lock?.release();
    };
  }, []);
}
