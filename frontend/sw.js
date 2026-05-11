// Minimal Service Worker for Dashboard Comercial 2026
// Only for PWA installation and standalone mode. No offline cache.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through to network
  event.respondWith(fetch(event.request));
});
