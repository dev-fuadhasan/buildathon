// Service Worker for Offline Support
// Version updates with each deployment to force cache refresh
const CACHE_VERSION = 'v3.0.0';
const CACHE_NAME = `momscare-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline';

// Assets to cache for offline use (only static assets, not HTML pages)
const STATIC_ASSETS = [
  '/offline',
  '/risk-detection',
  '/manifest.json',
  '/risk-questions.json', // Risk detection questions
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
              // Allow risk-detection page to work offline
              if (url.pathname === '/risk-detection') {
                return caches.match('/risk-detection');
              }
              // Show offline page for other navigation requests
              return caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }
  
  // Special handling for risk-questions.json - Cache First for offline support
  if (url.pathname === '/risk-questions.json') {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request)
            .then((response) => {
              if (response && response.status === 200) {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              }
              return response;
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
              if (networkResponse && networkResponse.status === 200) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseToCache);
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
            // Only cache successful responses
            if (response && response.status === 200 && response.type === 'basic') {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
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

