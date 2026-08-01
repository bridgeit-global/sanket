'use client';

import { SerwistProvider } from '@serwist/next/react';
import { Bell } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { toast } from 'sonner';
import { emitAppNotificationsUpdated } from '@/components/notification-bell';
import { Button } from '@/components/ui/button';
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

function navigateFromNotification(url: string) {
  let nextUrl: URL;
  try {
    nextUrl = new URL(url, window.location.origin);
  } catch {
    return;
  }

  if (nextUrl.origin !== window.location.origin) return;

  const next = nextUrl.pathname + nextUrl.search + nextUrl.hash;
  const current =
    window.location.pathname + window.location.search + window.location.hash;

  if (next === current) return;
  window.location.assign(next);
}

export function PwaProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'push-notification') {
        const title =
          typeof data.title === 'string' && data.title ? data.title : 'eOffice';
        const body = typeof data.body === 'string' ? data.body : '';
        const url = typeof data.url === 'string' ? data.url : '';

        emitAppNotificationsUpdated();

        toast.custom(
          (id) => (
            <div
              data-testid="push-toast"
              className="pointer-events-auto flex w-[min(356px,calc(100vw-2rem))] flex-row gap-3 rounded-lg border border-border bg-card p-3 text-card-foreground shadow-md"
            >
              <div className="shrink-0 pt-0.5 text-blue-600 dark:text-blue-400">
                <Bell className="size-4" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <p className="text-sm font-medium leading-5">{title}</p>
                  {body ? (
                    <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                      {body}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {url ? (
                    <Button
                      size="sm"
                      className="h-7 px-2.5 text-xs"
                      onClick={() => {
                        toast.dismiss(id);
                        navigateFromNotification(url);
                      }}
                    >
                      Open
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => toast.dismiss(id)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          ),
          {
            unstyled: true,
            duration: 12_000,
            id: typeof data.tag === 'string' && data.tag ? data.tag : undefined,
          },
        );
        return;
      }

      if (data.type === 'notification-click' && typeof data.url === 'string') {
        navigateFromNotification(data.url);
      }
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
