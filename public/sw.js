// Basic Service Worker for PWA Offline Support and Push Notifications
const CACHE_NAME = 'kramiz-v2';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/favicon.png',
    '/Kramiz%20app%20icon.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force update immediately
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            self.clients.claim(), // Take control immediately
            // Clear old caches
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
        ])
    );
});

self.addEventListener('fetch', (event) => {
    // Strategy: Stale-While-Revalidate for cached assets
    // This ensures we show something fast but update the cache in the background
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Return cached response if network fails
                return cachedResponse;
            });

            return cachedResponse || fetchPromise;
        })
    );
});

// Handle push notification events
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : { title: 'New Message', body: 'You have a new update in Kramiz' };

    const options = {
        body: data.body,
        icon: '/Kramiz%20app%20icon.png',
        badge: '/favicon.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/'
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
