const CACHE_NAME = 'quote-archive-v4-studio';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './license.html',
  './LICENSE.txt',
  './icon-192.png',
  './icon-512.png',
  './v4.js',
  './v4.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle safe GET requests.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never intercept cross-origin requests. Let the browser handle
  // external APIs, fonts, audio, images, and other third-party resources.
  if (url.origin !== self.location.origin) return;

  // Navigation: network first, then the cached app shell.
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Static app-shell assets: cache first, then network. Successful
  // responses are cached only for explicitly listed local assets.
  const isAppAsset = APP_SHELL.some((path) => {
    const assetURL = new URL(path, self.location.href);
    return assetURL.href === url.href;
  });

  if (isAppAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
  }
});

// Quote of the day notifications (sent by the archive server; see index.html).
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(d.title || 'Quote of the day', {
    body: d.body || '',
    tag: d.tag || 'quote-of-the-day',
    icon: './icon-192.png',
    badge: './icon-192.png',
    data: { url: d.url || './' }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if (c.url === url && 'focus' in c) return c.focus(); }
      return self.clients.openWindow(url);
    })
  );
});
