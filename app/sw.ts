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

  const url = payload.url ?? '/modules/operator';

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // Always tell open app tabs so they can show an in-app toast.
      for (const client of clientList) {
        if (!client.url.startsWith(self.location.origin)) continue;
        client.postMessage({
          type: 'push-notification',
          title: payload.title,
          body: payload.body,
          url,
          tag: payload.tag,
        });
      }

      const hasVisibleClient = clientList.some(
        (client) =>
          client.url.startsWith(self.location.origin) &&
          'visibilityState' in client &&
          (client as WindowClient).visibilityState === 'visible',
      );

      // Skip OS banner while the user is actively looking at the app.
      if (hasVisibleClient) return;

      await self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: '/favicon/android-chrome-192x192.png',
        badge: '/favicon/favicon-32x32.png',
        tag: payload.tag,
        data: { url },
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const path =
    typeof event.notification.data?.url === 'string' && event.notification.data.url
      ? event.notification.data.url
      : '/modules/operator';
  const targetUrl = new URL(path, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of clientList) {
        if (!client.url.startsWith(self.location.origin) || !('focus' in client)) {
          continue;
        }

        const windowClient = client as WindowClient;
        await windowClient.focus();

        // Prefer page-driven navigation. WindowClient.navigate() often only
        // focuses an existing SPA tab and never changes the route.
        windowClient.postMessage({ type: 'notification-click', url: path });
        return;
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});
