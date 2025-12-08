// Service Worker for Offline Support
// Version updates with each deployment to force cache refresh
const CACHE_VERSION = 'v2.1.0';
const CACHE_NAME = `momscare-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline';

// Assets to cache for offline use (only static assets, not HTML pages)
const STATIC_ASSETS = [
  '/offline',
  '/manifest.json',
];

// Install event - cache static assets only
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.log('Cache install failed:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name.startsWith('momscare-'))
          .map((name) => {
            console.log('Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Force all clients to use the new service worker
      return self.clients.claim();
    })
  );
});

// Fetch event - Network first strategy for HTML, cache first for static assets
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Skip unsupported schemes (chrome-extension, chrome, about, data, blob, etc.)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip cross-origin requests (only cache same-origin)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip API calls - always use network
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Skip service worker and manifest - always use network
  if (url.pathname === '/sw.js' || url.pathname === '/manifest.json') {
    return;
  }

  // For HTML pages (navigation requests) - Network First strategy
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If network succeeds, return fresh response (don't cache HTML)
          return response;
        })
        .catch(() => {
          // If offline, try cache, otherwise show offline page
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Show offline page for navigation requests
              return caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }

  // For static assets (JS, CSS, images, etc.) - Cache First strategy
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version, but also update cache in background
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  // Extra safety check before caching
                  try {
                    const requestUrl = new URL(event.request.url);
                    // Only cache http/https and same-origin
                    if (requestUrl.protocol.startsWith('http') && requestUrl.origin === self.location.origin) {
                      cache.put(event.request, responseToCache).catch((err) => {
                        console.warn('Failed to update cache:', event.request.url, err);
                      });
                    }
                  } catch (err) {
                    console.warn('Cache update error:', err);
                  }
                });
              }
            })
            .catch(() => {
              // Network failed, but we have cache, so that's fine
            });
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(event.request)
          .then((response) => {
            // Only cache successful responses from same origin
            if (response && response.status === 200 && response.type === 'basic') {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                // Extra safety check before caching
                try {
                  const requestUrl = new URL(event.request.url);
                  // Only cache http/https and same-origin
                  if (requestUrl.protocol.startsWith('http') && requestUrl.origin === self.location.origin) {
                    cache.put(event.request, responseToCache).catch((err) => {
                      console.warn('Failed to cache:', event.request.url, err);
                    });
                  }
                } catch (err) {
                  console.warn('Cache put error:', err);
                }
              });
            }
            return response;
          })
          .catch(() => {
            // Network failed and not in cache
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

