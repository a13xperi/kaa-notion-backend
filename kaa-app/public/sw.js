// KAA App Service Worker
// Provides offline functionality and caching

const CACHE_NAME = 'kaa-app-v1.0.1';
const STATIC_CACHE = 'kaa-static-v1.0.1';
const DYNAMIC_CACHE = 'kaa-dynamic-v1.0.1';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
  '/favicon.ico'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/notion\/pages/,
  /\/api\/notion\/databases/,
  /\/api\/client\/data/,
  /\/api\/client\/verify/,
  /\/api\/projects/,
  /\/api\/notifications/,
  /\/api\/admin\/dashboard/,
  /\/api\/admin\/analytics/
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('[SW] Static files cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static files:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static file requests
  if (request.method === 'GET') {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // For other requests, try network first
  event.respondWith(fetch(request));
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // If successful, cache the response
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', request.url);
    
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback for API requests
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'You are currently offline. Some features may not be available.',
        offline: true
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static file requests with cache-first strategy
async function handleStaticRequest(request) {
  // Try cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    // Cache miss, try network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for static file:', request.url);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/') || new Response('Offline', { status: 503 });
    }
    
    // For other static files, return a generic offline response
    return new Response('Offline', { status: 503 });
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'message-sync') {
    event.waitUntil(syncMessages());
  } else if (event.tag === 'upload-sync') {
    event.waitUntil(syncUploads());
  }
});

// Sync pending messages when back online
async function syncMessages() {
  try {
    const pendingMessages = await getPendingMessages();
    
    for (const message of pendingMessages) {
      try {
        await fetch('/api/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        });
        
        // Remove from pending after successful send
        await removePendingMessage(message.id);
        console.log('[SW] Synced message:', message.id);
      } catch (error) {
        console.error('[SW] Failed to sync message:', message.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Sync pending uploads when back online
async function syncUploads() {
  try {
    const pendingUploads = await getPendingUploads();
    
    for (const upload of pendingUploads) {
      try {
        const formData = new FormData();
        formData.append('file', upload.file);
        formData.append('address', upload.address);
        formData.append('category', upload.category);
        
        await fetch('/api/client/upload', {
          method: 'POST',
          body: formData
        });
        
        // Remove from pending after successful upload
        await removePendingUpload(upload.id);
        console.log('[SW] Synced upload:', upload.id);
      } catch (error) {
        console.error('[SW] Failed to sync upload:', upload.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let notificationData = {
    title: 'SAGE Platform',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'default',
    url: '/'
  };

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || notificationData.tag,
        url: data.url || data.data?.url || notificationData.url,
        ...data
      };
    } catch (e) {
      // If not JSON, use as body text
      notificationData.body = event.data.text();
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    vibrate: [200, 100, 200],
    requireInteraction: notificationData.requireInteraction || false,
    data: {
      dateOfArrival: Date.now(),
      url: notificationData.url,
      ...notificationData.data
    },
    actions: notificationData.actions || [
      {
        action: 'open',
        title: 'Open',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  // Handle dismiss action
  if (event.action === 'dismiss') {
    return;
  }

  // Get URL from notification data or use default
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window/tab open
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            // Navigate existing window to the URL and focus it
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // If no window is open, open a new one
        return clients.openWindow(urlToOpen);
      })
  );
});

// Handle notification close (for analytics/cleanup)
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
});

// Helper functions for IndexedDB operations
async function getPendingMessages() {
  // In a real implementation, this would use IndexedDB
  // For now, return empty array
  return [];
}

async function removePendingMessage(id) {
  // In a real implementation, this would use IndexedDB
  console.log('[SW] Removing pending message:', id);
}

async function getPendingUploads() {
  // In a real implementation, this would use IndexedDB
  // For now, return empty array
  return [];
}

async function removePendingUpload(id) {
  // In a real implementation, this would use IndexedDB
  console.log('[SW] Removing pending upload:', id);
}
