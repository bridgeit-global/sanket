'use client';

import { SerwistProvider } from '@serwist/next/react';
import { useEffect, useRef, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useTranslations } from '@/hooks/use-translations';

function ServiceWorkerUpdatePrompt() {
  const { t } = useTranslations();
  const toastShownRef = useRef(false);
  const hadControllerRef = useRef(
    typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator &&
      Boolean(navigator.serviceWorker.controller),
  );

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const showUpdatePrompt = () => {
      if (toastShownRef.current) return;
      toastShownRef.current = true;

      toast(t('pwa.updateAvailable'), {
        description: t('pwa.updateDescription'),
        duration: Number.POSITIVE_INFINITY,
        action: {
          label: t('common.refresh'),
          onClick: () => window.location.reload(),
        },
      });
    };

    const onControllerChange = () => {
      if (!hadControllerRef.current) {
        hadControllerRef.current = true;
        return;
      }
      showUpdatePrompt();
    };

    const watchForUpdates = async () => {
      const registration = await navigator.serviceWorker.ready;

      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdatePrompt();
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            showUpdatePrompt();
          }
        });
      });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      void navigator.serviceWorker.ready.then((registration) => registration.update());
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    void watchForUpdates();

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [t]);

  return null;
}

export function PwaProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'notification-click' || !event.data?.url) return;
      const nextUrl = new URL(event.data.url, window.location.origin);
      if (nextUrl.origin !== window.location.origin) return;
      window.location.assign(nextUrl.pathname + nextUrl.search + nextUrl.hash);
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, []);

  return (
    <SerwistProvider swUrl="/sw.js">
      <ServiceWorkerUpdatePrompt />
      {children}
    </SerwistProvider>
  );
}
