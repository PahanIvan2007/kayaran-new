const CACHE = 'kayran-v3';
const STATIC = 'kayran-static-v3';

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(STATIC);
    await cache.addAll(['/frontend/', '/frontend/index.html', '/frontend/manifest.json']);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Static files - cache first
  if (url.origin === location.origin && !url.pathname.startsWith('/api/')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        }).catch(() => cached || new Response('Офлайн', { status: 503 }));
        return cached || fetchPromise;
      })
    );
    return;
  }

  // API requests - network first, cache fallback
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(e.request);
        if (cached) return cached;
        if (url.pathname === '/auth/me') {
          return new Response(JSON.stringify({}), { status: 401, headers: { 'Content-Type': 'application/json' }});
        }
        return new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      })
  );
});
