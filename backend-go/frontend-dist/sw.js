const CACHE = 'kayran-v6';

self.addEventListener('install', e => {
  self.skipWaiting();
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
  if (url.origin !== location.origin) { e.respondWith(fetch(e.request)); return; }
  const isStatic = /\.(js|css|html?|png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot|map)$/i.test(url.pathname);
  if (isStatic) {
    e.respondWith(staleWhileRevalidate(e.request));
  } else if (e.request.method === 'GET') {
    e.respondWith(networkFirst(e.request));
  }
});

async function staleWhileRevalidate(req) {
  const cached = await caches.match(req);
  const net = fetch(req).then(r => (r.ok && caches.open(CACHE).then(c => c.put(req, r.clone())), r));
  return cached || net;
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
    return res;
  } catch {
    const cached = await caches.match(req);
    if (req.url.endsWith('/auth/me') && !cached) {
      return new Response(JSON.stringify({}), { status: 401, headers: { 'Content-Type': 'application/json' }});
    }
    return cached || fetch(req);
  }
}
