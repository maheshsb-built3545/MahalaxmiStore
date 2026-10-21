'use strict';

/**
 * Mahalaxmi Kirana Store — Service Worker (sw.js)
 * Bump CACHE_VERSION on every UI change.
 * Network-first for HTML, CSS, JS, and Catalog APIs to ensure recent UI changes show up immediately.
 * Cache-first only for static media (images, icons, fonts).
 * Offline shell fallback for HTML navigation.
 * NEVER caches mutations, auth tokens, or order placement.
 */

const CACHE_VERSION = 'v1.0.9';
const CACHE_NAME = `mk-cache-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/checkout.html',
  '/orders.html',
  '/order-confirmation.html',
  '/account.html',
  '/inbox.html',
  '/login.html',
  '/register.html',
  '/privacy.html',
  '/offline.html',
  '/css/style.css',
  '/css/motion.css',
  '/css/mobile-app.css',
  '/js/config.js',
  '/js/auth.js',
  '/js/cart.js',
  '/js/catalog.js',
  '/js/checkout.js',
  '/js/orders.js',
  '/js/ui.js',
  '/js/ai-order.js',
  '/manifest.webmanifest',
  '/images/icon-192.svg',
  '/images/icon-512.svg',
  '/images/placeholder-store.svg',
  '/images/placeholder-upi-qr.svg',
];

// Install: pre-cache application shell and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn('[SW] Cache addAll partial warning:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old versioned caches and claim all clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              console.log('[SW] Purging stale cache:', key);
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: smart caching strategy
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. NEVER intercept non-GET requests or mutation endpoints
  if (req.method !== 'GET') {
    return;
  }

  // 2. Auth routes: always strictly network, never cached
  if (url.pathname.startsWith('/api/auth')) {
    return;
  }

  // 3. Admin panel routes & APIs: Network-first with cache fallback
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/admin')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 4. Navigation requests (HTML pages): Network-first with cache fallback, then offline.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        })
        .catch(async () => {
          const cachedPage = await caches.match(req);
          if (cachedPage) return cachedPage;
          const offlinePage = await caches.match('/offline.html');
          return offlinePage || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        })
    );
    return;
  }

  // 5. Read-only Catalog & Settings APIs: Network-first, cache fallback
  if (
    url.pathname.startsWith('/api/products') ||
    url.pathname.startsWith('/api/categories') ||
    url.pathname.startsWith('/api/settings')
  ) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 6. Code assets (CSS, JS, manifest): Network-first with cache fallback
  // This ensures recent UI changes show up immediately without requiring site data clearing
  const isCodeAsset =
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.webmanifest') ||
    url.pathname.endsWith('.json');

  if (isCodeAsset) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes.status === 200 && url.origin === self.location.origin) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 7. Media & static assets (Images, Icons, SVG, Fonts): Cache-first with network fallback
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // Background revalidation
        fetch(req)
          .then((networkRes) => {
            if (networkRes.status === 200 && url.origin === self.location.origin) {
              caches.open(CACHE_NAME).then((cache) => cache.put(req, networkRes));
            }
          })
          .catch(() => {});
        return cached;
      }
      return fetch(req).then((networkRes) => {
        if (networkRes.status === 200 && url.origin === self.location.origin) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return networkRes;
      });
    })
  );
});
