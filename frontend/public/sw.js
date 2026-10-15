// Service Worker for Sri Lakshmi Srinivasa Gents PG Management
// Handles system push notifications and notification click routing into Windows Action Center

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push notification received
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'Sri Lakshmi Srinivasa Gents PG';
    const options = {
      body: data.body || data.message || '',
      icon: data.icon || '/favicon.svg',
      badge: data.badge || '/favicon.svg',
      data: {
        link: data.link || '/',
        id: data.id || null,
        created_at: data.created_at || new Date().toISOString(),
      },
      tag: data.tag || (data.id ? `pg-notif-${data.id}` : 'pg-notification'),
      renotify: true,
      requireInteraction: data.requireInteraction || false,
      timestamp: data.timestamp || Date.now(),
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Failed to parse push notification payload:', err);
  }
});

// Windows notification clicked from bottom-right toast or Windows Action Center
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetLink = event.notification.data?.link || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a tab is already open with the application, focus and navigate it
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && targetLink) {
            return client.navigate(targetLink);
          }
          return;
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetLink);
      }
    })
  );
});
