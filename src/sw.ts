/// <reference lib="webworker" />
/// <reference lib="es2020" />

// Add missing types for periodic sync and custom service worker
interface PeriodicSyncEvent extends ExtendableEvent {
  tag: string;
}

declare global {
  interface ServiceWorkerGlobalScopeEventMap {
    periodicsync: PeriodicSyncEvent;
  }
}

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

declare const self: ServiceWorkerGlobalScope;

// Use with precache injection
precacheAndRoute(self.__WB_MANIFEST);

// Clean old assets
cleanupOutdatedCaches();

// To allow work offline
// Handle navigation to index.html for SPA routing
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('index.html').then(response => {
          return response || new Response('Network error', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
    );
  }
});


// Cache images
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  }),
);

// Cache Google Fonts stylesheets
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets',
  })
);

// Cache Google Fonts webfonts
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
      }),
    ],
  })
);

// Cache API responses
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-responses',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
);

// Background Sync for data that needs to be sent to the server
const bgSyncPlugin = new BackgroundSyncPlugin('tarotforge-outbox', {
  maxRetentionTime: 24 * 60, // Retry for max of 24 Hours (specified in minutes)
});

// Register route for background sync of POST requests
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/upload') || url.pathname.startsWith('/api/deck'),
  new NetworkFirst({
    plugins: [bgSyncPlugin],
  }),
  'POST'
);

// Push notification event listener
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'Tarot Forge';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/ios/192.png',
    badge: '/ios/192.png',
    data,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // If a window client already exists, focus it
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      return self.clients.openWindow(url);
    })
  );
});

// Periodic Sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'tarot-daily-update') {
    event.waitUntil(fetchDailyTarotCard());
  }
});

// Function to fetch daily tarot card
async function fetchDailyTarotCard() {
  try {
    // Check if we need to fetch a new card
    const lastFetch = await self.caches.match('/api/daily-card-timestamp');
    const now = Date.now();
    const needsUpdate = !lastFetch || (now - (await lastFetch.json()).timestamp) > 24 * 60 * 60 * 1000;
    
    if (needsUpdate) {
      // Fetch new card and store in cache
      const response = await fetch('/api/daily-tarot-card');
      const cache = await self.caches.open('daily-tarot');
      
      if (response.ok) {
        const cardData = await response.clone().json();
        
        // Show notification for new daily card
        await self.registration.showNotification('Daily Tarot Card', {
          body: `Today's card is: ${cardData.name}`,
          icon: cardData.image || '/ios/192.png',
          data: { url: '/daily-card' }
        });
        
        // Store card in cache
        await cache.put('/api/daily-tarot-card', response);
        
        // Update timestamp
        await cache.put(
          '/api/daily-card-timestamp',
          new Response(JSON.stringify({ timestamp: now }))
        );
      }
    }
  } catch (error) {
    console.error('Failed to fetch daily tarot card:', error);
  }
}

// Take control immediately
self.skipWaiting();
clientsClaim();
