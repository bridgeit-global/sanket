import 'server-only';

import webpush from 'web-push';
import {
  deleteStaleSubscriptions,
  getPushSubscriptionsForUser,
  getSubscribedTestAdminUserIds,
  getUserIdsWithModuleAccess,
} from '@/lib/push/subscriptions';
import type { PushNotificationPayload } from '@/lib/push/types';
import { configureVapid, isPushConfigured } from '@/lib/push/vapid';

async function sendToSubscription(
  subscription: {
    endpoint: string;
    p256dh: string;
    auth: string;
  },
  payload: PushNotificationPayload,
): Promise<'sent' | 'stale'> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload),
    );
    return 'sent';
  } catch (error) {
    if (
      error instanceof webpush.WebPushError &&
      (error.statusCode === 404 || error.statusCode === 410)
    ) {
      return 'stale';
    }
    throw error;
  }
}

export async function sendPushToUser(
  userId: string,
  payload: PushNotificationPayload,
): Promise<void> {
  if (!isPushConfigured()) return;
  configureVapid();

  const subscriptions = await getPushSubscriptionsForUser(userId);
  if (subscriptions.length === 0) return;

  const staleEndpoints: string[] = [];

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        const result = await sendToSubscription(subscription, payload);
        if (result === 'stale') {
          staleEndpoints.push(subscription.endpoint);
        }
      } catch (error) {
        console.error('Failed to send push notification:', error);
      }
    }),
  );

  if (staleEndpoints.length > 0) {
    await deleteStaleSubscriptions(staleEndpoints);
  }
}

export async function sendPushToUsers(
  userIds: string[],
  payload: PushNotificationPayload,
  options?: { excludeUserId?: string },
): Promise<void> {
  const uniqueIds = [
    ...new Set(
      userIds.filter((id) => id && id !== options?.excludeUserId),
    ),
  ];

  await Promise.all(uniqueIds.map((userId) => sendPushToUser(userId, payload)));
}

export async function sendPushToModule(
  moduleKey: string,
  payload: PushNotificationPayload,
  options?: { excludeUserId?: string },
): Promise<void> {
  const userIds = await getUserIdsWithModuleAccess(moduleKey);
  await sendPushToUsers(userIds, payload, options);
}

/** Test: push only to login user `admin` if they subscribed via Profile. */
export async function sendPushToSubscribedAdmins(
  payload: PushNotificationPayload,
): Promise<string[]> {
  const userIds = await getSubscribedTestAdminUserIds();
  await sendPushToUsers(userIds, payload);
  return userIds;
}

export function notifyPush(
  send: () => Promise<void>,
): void {
  void send().catch((error) => {
    console.error('Push notification error:', error);
  });
}
