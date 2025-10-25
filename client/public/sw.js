// Bump this value when you deploy a new client build to force the
// service worker to install a fresh cache (e.g. 'chronify-v2').
const CACHE_NAME = 'chronify-v2';

// Keep static assets minimal and stable. Avoid caching /src/* in production
// since build tooling emits hashed files — prefer caching index, manifest
// and the compiled CSS/JS bundles produced by your build process.
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/index.css'
];

const API_CACHE_NAME = 'chronify-api-v1';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Error caching static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
            return null;
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated successfully');
        // Claim clients so the new SW starts controlling pages ASAP
        return self.clients.claim();
      })
  );
});

// Fetch event - implement offline-first strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests separately (network-first with cache fallback)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // For navigation requests (single-page app) use NETWORK-FIRST so index.html
  // doesn't get stuck in an old cached version. Fallback to cache when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Update the index.html cache with fresh content
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For other static assets, use cache-first but still populate cache on fetch
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request)
          .then((response) => {
            // Clone the response before caching
            const responseClone = response.clone();
            // Cache successful responses
            if (response.status === 200) {
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(request, responseClone));
            }
            return response;
          })
          .catch(() => new Response('Offline', { status: 503 }));
      })
  );
});

// Handle API requests with offline-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first for API requests
    const response = await fetch(request.clone());
    
    if (response.ok) {
      // Cache successful GET requests
      if (request.method === 'GET') {
        const cache = await caches.open(API_CACHE_NAME);
        await cache.put(request, response.clone());
      }
      
      // Notify main thread that we're online
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'ONLINE_STATUS',
            online: true
          });
        });
      });
    }
    
    return response;
  } catch (error) {
    console.log('Service Worker: Network failed, checking cache...');
    
    // Notify main thread that we're offline
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'ONLINE_STATUS',
          online: false
        });
      });
    });
    
    // For GET requests, try to serve from cache
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // For non-GET requests (POST, PUT, DELETE), queue them for later sync
    if (request.method !== 'GET') {
      await queueOfflineRequest(request);
      
      // Return a mock success response to prevent errors in the UI
      return new Response(JSON.stringify({
        success: true,
        offline: true,
        message: 'Request queued for sync when online'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Fallback error response
    return new Response(JSON.stringify({
      error: 'Offline and no cached data available'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Queue offline requests for later sync
async function queueOfflineRequest(request) {
  const requestData = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: request.method !== 'GET' ? await request.text() : null,
    timestamp: Date.now(),
    id: generateUniqueId()
  };
  
  // Store in IndexedDB or send to main thread
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'QUEUE_OFFLINE_REQUEST',
        requestData: requestData
      });
    });
  });
}

// Generate unique ID for offline requests
function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Listen for sync events when coming back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Background sync triggered');
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'BACKGROUND_SYNC',
            action: 'sync-offline-data'
          });
        });
      })
    );
  }
});

// Listen for messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});