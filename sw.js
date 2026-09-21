const CACHE_NAME = 'quote-archive-v2-5-post-images';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './license.html',
  './LICENSE.txt',
  './icon-192.png',
  './icon-512.png'
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
