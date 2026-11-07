// Offline support for the single-file tester build.
// Serves the saved copy instantly, then refreshes it from the network in the background.
// Bump CACHE whenever index.html changes so devices drop any old copy.
const CACHE = 'slate-tester-v3';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(CACHE).then((cache) => cache.match(e.request).then((hit) => {
      const net = fetch(e.request)
        .then((res) => { if (res && res.status === 200) cache.put(e.request, res.clone()); return res; })
        .catch(() => hit);
      return hit || net;
    })),
  );
});
