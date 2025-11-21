/**
 * Service Worker for Offline Functionality
 * Phase 3: Offline capability
 *
 * Handles:
 * - Offline caching of critical assets
 * - Background sync for queued operations
 * - Push notifications
 */

const CACHE_NAME = 'barkbase-v1';
const RUNTIME_CACHE = 'barkbase-runtime-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/v1\/bookings\?date=.+/,
  /\/api\/v1\/pets/,
  /\/api\/v1\/owners/,
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
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
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fall back to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API requests - network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Static assets - cache first
  event.respondWith(cacheFirstStrategy(request));
});

// Network-first strategy (for API calls)
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page or error
    return new Response(
      JSON.stringify({ error: 'Offline', cached: false }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Cache-first strategy (for static assets)
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

// Background sync for queued operations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-operations') {
    event.waitUntil(syncQueuedOperations());
  }
});

async function syncQueuedOperations() {
  // Get queued operations from IndexedDB
  const db = await openDB();
  const operations = await getAllOperations(db);

  for (const operation of operations) {
    try {
      const response = await fetch(operation.url, {
        method: operation.method,
        headers: operation.headers,
        body: operation.body,
      });

      if (response.ok) {
        // Remove from queue
        await deleteOperation(db, operation.id);
      }
    } catch (error) {
      console.error('Sync failed for operation:', operation.id, error);
    }
  }
}

// IndexedDB helpers
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('BarkBaseOffline', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('operations')) {
        db.createObjectStore('operations', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function getAllOperations(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['operations'], 'readonly');
    const store = transaction.objectStore('operations');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function deleteOperation(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['operations'], 'readwrite');
    const store = transaction.objectStore('operations');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  const options = {
    body: data.body || 'New update available',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: data.tag || 'default',
    data: data.data,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'BarkBase', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
