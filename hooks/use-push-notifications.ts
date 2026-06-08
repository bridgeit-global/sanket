'use client';

import { useCallback, useEffect, useState } from 'react';

type PushPermissionState = 'unsupported' | 'default' | 'granted' | 'denied';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<PushPermissionState>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  useEffect(() => {
    if (!isSupported) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission as PushPermissionState);
  }, [isSupported]);

  const checkSubscription = useCallback(async () => {
    if (!isSupported) return false;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    setIsSubscribed(Boolean(subscription));
    return Boolean(subscription);
  }, [isSupported]);

  useEffect(() => {
    if (isSupported && permission === 'granted') {
      void checkSubscription();
    }
  }, [checkSubscription, isSupported, permission]);

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const keyResponse = await fetch('/api/push/vapid-public-key');
      if (!keyResponse.ok) {
        throw new Error('Push notifications are not configured on the server');
      }

      const { publicKey } = await keyResponse.json();
      const result = await Notification.requestPermission();
      setPermission(result as PushPermissionState);

      if (result !== 'granted') {
        setError('Notification permission was denied');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const subscriptionJson = subscription.toJSON();
      const saveResponse = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscriptionJson.endpoint,
          keys: subscriptionJson.keys,
          userAgent: navigator.userAgent,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save push subscription');
      }

      setIsSubscribed(true);
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to enable notifications',
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return false;

    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to disable notifications',
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    checkSubscription,
  };
}
