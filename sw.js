const CACHE = 'cove-v15-ui-icons-layout';
const CORE = [
  './',
  './index.html',
  './reader-host.html',
  './manifest.webmanifest',
  './assets/app.css?v=15',
  './assets/fonts/lexend-400.woff2',
  './assets/fonts/lexend-700.woff2',
  './vendor/purify.min.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './src/app.js?v=15',
  './src/store.js',
  './src/url.js',
  './src/ui.js',
  './src/library.js',
  './src/folders.js',
  './src/item.js',
  './src/intake.js',
  './src/backup.js',
  './src/settings.js',
  './src/import.js',
  './src/extract.js',
  './src/reader.js',
  './src/reader-frame.js',
  './src/annotation.js',
  './src/retention.js',
  './src/sync.js',
  './src/journal.js',
  // Canonical shared deployment, one level above every app (see
  // docs/README-KO.md) — outside this SW's own scope, so each entry's
  // failure is swallowed individually and never blocks install.
  '../shared/v1/sync.js',
  '../shared/v2/journal.js',
];
self.addEventListener('install', (e) =>
  e.waitUntil(
    (async () => {
      const c = await caches.open(CACHE);
      await Promise.all(CORE.map((u) => c.add(u).catch(() => {})));
      self.skipWaiting();
    })(),
  ),
);
self.addEventListener('activate', (e) =>
  e.waitUntil(
    (async () => {
      await Promise.all(
        (await caches.keys()).filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      );
      self.clients.claim();
    })(),
  ),
);
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    (async () => {
      const cached = await caches.match(e.request, {
        ignoreSearch: url.pathname.endsWith('/') || url.pathname.endsWith('/index.html'),
      });
      if (cached) return cached;
      try {
        const res = await fetch(e.request);
        if (res.ok) {
          const c = await caches.open(CACHE);
          c.put(e.request, res.clone());
        }
        return res;
      } catch {
        return caches.match('./index.html');
      }
    })(),
  );
});
