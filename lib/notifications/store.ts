import 'server-only';

import { supabase } from '@/lib/supabase/server';
import { throwOnSupabaseError } from '@/lib/db/errors';
import { TABLES, type AppNotification } from '@/lib/db/schema';
import { mapAppNotificationRow } from '@/lib/db/mappers';
import type { PushNotificationPayload } from '@/lib/push/types';

export async function createAppNotificationsForUsers(
  userIds: string[],
  payload: PushNotificationPayload,
): Promise<void> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) return;

  const rows = uniqueIds.map((userId) => ({
    user_id: userId,
    title: payload.title,
    body: payload.body,
    url: payload.url,
    tag: payload.tag ?? null,
  }));

  const { error } = await supabase.from(TABLES.appNotification).insert(rows);
  throwOnSupabaseError(error, 'Failed to create app notifications');
}

export async function listAppNotificationsForUser(
  userId: string,
  options?: { limit?: number },
): Promise<AppNotification[]> {
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);

  const { data, error } = await supabase
    .from(TABLES.appNotification)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  throwOnSupabaseError(error, 'Failed to list app notifications');

  return (data ?? []).map(mapAppNotificationRow);
}

export async function countUnreadAppNotifications(
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from(TABLES.appNotification)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);
  throwOnSupabaseError(error, 'Failed to count unread app notifications');
  return count ?? 0;
}

export async function markAppNotificationRead(
  userId: string,
  notificationId: string,
): Promise<AppNotification | null> {
  const { data, error } = await supabase
    .from(TABLES.appNotification)
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .is('read_at', null)
    .select('*')
    .maybeSingle();
  throwOnSupabaseError(error, 'Failed to mark notification as read');

  if (!data) {
    const { data: existing, error: fetchError } = await supabase
      .from(TABLES.appNotification)
      .select('*')
      .eq('id', notificationId)
      .eq('user_id', userId)
      .maybeSingle();
    throwOnSupabaseError(fetchError, 'Failed to fetch notification');
    return existing ? mapAppNotificationRow(existing) : null;
  }

  return mapAppNotificationRow(data);
}

export async function markAllAppNotificationsRead(
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from(TABLES.appNotification)
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)
    .select('id');
  throwOnSupabaseError(error, 'Failed to mark all notifications as read');
  return data?.length ?? 0;
}
