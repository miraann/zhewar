const CACHE_NAME = 'zhewar-pwa-v2'; // bumped — forces old cache eviction on all clients

// App shell pages pre-cached on install for offline support
const PRECACHE = ['/', '/book', '/my-bookings', '/offline'];

// These same-origin paths MUST always hit the network — never serve from cache.
// /api/  → booking actions, admin login, auth — stale responses are a security risk
// /admin/ → admin dashboard — must reflect live auth and appointment state
const NEVER_CACHE_PATHS = ['/api/', '/admin/'];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// ── Activate: wipe every old cache version ───────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // ── Rule 1: Non-GET requests always bypass (POST/PATCH/DELETE go straight to network)
  if (request.method !== 'GET') return;

  // ── Rule 2: API routes and admin panel — NEVER cache, always network
  if (NEVER_CACHE_PATHS.some((path) => url.pathname.startsWith(path))) return;

  // ── Rule 3: Supabase origin — only cache public storage images
  //    Everything else on supabase.co (REST API /rest/v1/, auth /auth/v1/,
  //    realtime WebSocket /realtime/v1/) falls through to the network untouched.
  if (url.hostname.includes('supabase.co')) {
    if (url.pathname.startsWith('/storage/v1/object/public/')) {
      // Stale-while-revalidate: serve cached photo instantly, refresh in background
      e.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
          const cached = await cache.match(request);
          const fresh  = fetch(request).then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          });
          return cached ?? fresh;
        })
      );
    }
    // All other supabase.co requests — pass through, no interception
    return;
  }

  // ── Rule 4: Non-Supabase cross-origin requests — don't intercept
  if (url.hostname !== self.location.hostname) return;

  // ── Rule 5: Same-origin app shell + static assets — network-first, offline fallback
  e.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, res.clone()));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        return cached ?? caches.match('/offline');
      })
  );
});
