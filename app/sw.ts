import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload: PushPayload = {
    title: 'eOffice',
    body: 'You have a new notification',
    url: '/modules/operator',
  };

  try {
    payload = { ...payload, ...event.data.json() };
  } catch {
    payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/favicon/android-chrome-192x192.png',
      badge: '/favicon/favicon-32x32.png',
      tag: payload.tag,
      data: { url: payload.url ?? '/modules/operator' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = (event.notification.data?.url as string) ?? '/modules/operator';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const targetUrl = new URL(url, self.location.origin).href;

        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});
