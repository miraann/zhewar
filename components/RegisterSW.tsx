'use client';
import { useEffect } from 'react';

export default function RegisterSW() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') {
      // In dev, next dev rebuilds reuse the same /_next/static/ chunk paths
      // with different content on every recompile. A service worker caching
      // those cache-first (as sw.js does, assuming prod's content-hashed
      // immutability) ends up serving stale chunks forever, which crashes
      // the app with "Cannot read properties of undefined (reading 'call')".
      // Unregister any SW left over from testing a prod build locally so
      // dev self-heals instead of staying broken until the user clears it.
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
      caches?.keys?.().then((keys) => keys.forEach((k) => caches.delete(k)));
      return;
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch(() => {});
  }, []);
  return null;
}
