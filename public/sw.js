/* Slate service worker: makes the installed app work offline.
   - Pages (navigations): network first, so an online user always gets the latest
     release; falls back to the cached copy when offline.
   - Everything else (hashed JS/CSS/fonts/icons): cache first. Build files have
     content hashes in their names, so a new release never reuses a stale file.
   Bump CACHE only if the caching strategy itself changes. */

const CACHE = 'slate-v3';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function saveCopy(request, response) {
  if (!response || !response.ok) return;
  const copy = response.clone();
  caches.open(CACHE).then((cache) => cache.put(request, copy));
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => { saveCopy(request, response); return response; })
        .catch(() => caches.match(request).then((hit) => hit || caches.match('./'))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((hit) => hit || fetch(request).then((response) => { saveCopy(request, response); return response; })),
  );
});
