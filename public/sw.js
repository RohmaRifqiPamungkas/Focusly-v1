const CACHE_NAME = 'focusly-cache-v1';

const ASSETS_TO_CACHE = [
  '/',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// self.addEventListener('fetch', (event) => {
//   if (event.request.method !== 'GET') return;

//   const url = new URL(event.request.url);

//   if (!url.origin.startsWith(self.location.origin)) return;

//   // Skip supabase auth api paths and dev servers
//   if (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/api/')) return;

//   event.respondWith(
//     fetch(event.request)
//       .then((networkResponse) => {
//         if (
//           networkResponse &&
//           networkResponse.status === 200 &&
//           (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff2|css|js)$/))
//         ) {
//           const cacheCopy = networkResponse.clone();
//           caches.open(CACHE_NAME).then((cache) => {
//             cache.put(event.request, cacheCopy);
//           });
//         }
//         return networkResponse;
//       })
//       .catch(() => {
//         return caches.match(event.request).then((cachedResponse) => {
//           if (cachedResponse) {
//             return cachedResponse;
//           }
//           if (event.request.mode === 'navigate') {
//             return caches.match('/');
//           }
//         });
//       })
//   );
// });

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (!url.origin.startsWith(self.location.origin) || url.host.includes('supabase.co')) {
    return; 
  }

  if (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff2|css|js)$/))
        ) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cacheCopy);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }

          return new Response('Network error occurred', { status: 408, headers: { 'Content-Type': 'text/plain' } });
        });
      })
  );
});
