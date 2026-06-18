const CACHE_NAME = 'zhewar-pwa-v1';

// App shell — always available offline
const PRECACHE = ['/', '/book', '/my-bookings', '/offline'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin API requests (Supabase, etc.)
  if (request.method !== 'GET') return;
  if (url.hostname !== self.location.hostname && !url.hostname.endsWith('supabase.co') === false) return;

  // For Supabase storage images — stale-while-revalidate
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/storage/')) {
    e.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const fresh  = fetch(request).then((res) => { cache.put(request, res.clone()); return res; });
        return cached ?? fresh;
      })
    );
    return;
  }

  // For same-origin navigation and assets — network first, cache fallback
  if (url.hostname === self.location.hostname) {
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
  }
});
