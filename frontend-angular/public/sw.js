const CACHE = 'kayran-static-v5';

self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || url.pathname.startsWith('/api/')) {
    e.respondWith(networkFirst(e.request));
    return;
  }
  e.respondWith(staleWhileRevalidate(e.request));
});

async function staleWhileRevalidate(req) {
  const cached = await caches.match(req);
  const fetchPromise = fetch(req).then(res => {
    if (res.ok) {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(req, clone));
    }
    return res;
  }).catch(() => cached);
  return cached || fetchPromise;
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res.ok) {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(req, clone));
    }
    return res;
  } catch {
    const cached = await caches.match(req);
    if (cached) return cached;
    if (req.url.endsWith('/auth/me')) {
      return new Response(JSON.stringify({}), { status: 401, headers: { 'Content-Type': 'application/json' }});
    }
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
