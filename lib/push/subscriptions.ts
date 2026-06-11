import 'server-only';

import { supabase } from '@/lib/supabase/server';
import { throwOnSupabaseError } from '@/lib/db/errors';
import { TABLES } from '@/lib/db/schema';
import { mapPushSubscriptionRow } from '@/lib/db/mappers';

export async function savePushSubscription({
  userId,
  endpoint,
  p256dh,
  auth,
  userAgent,
}: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}) {
  const { data: existing, error: fetchError } = await supabase
    .from(TABLES.pushSubscription)
    .select('*')
    .eq('endpoint', endpoint)
    .maybeSingle();
  throwOnSupabaseError(fetchError, 'Failed to fetch push subscription');

  if (existing) {
    const { data: updated, error } = await supabase
      .from(TABLES.pushSubscription)
      .update({
        user_id: userId,
        p256dh,
        auth,
        user_agent: userAgent ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('endpoint', endpoint)
      .select()
      .single();
    throwOnSupabaseError(error, 'Failed to update push subscription');
    return mapPushSubscriptionRow(updated);
  }

  const { data: created, error } = await supabase
    .from(TABLES.pushSubscription)
    .insert({
      user_id: userId,
      endpoint,
      p256dh,
      auth,
      user_agent: userAgent ?? null,
    })
    .select()
    .single();
  throwOnSupabaseError(error, 'Failed to create push subscription');
  return mapPushSubscriptionRow(created);
}

export async function deletePushSubscriptionByEndpoint(endpoint: string) {
  const { error } = await supabase
    .from(TABLES.pushSubscription)
    .delete()
    .eq('endpoint', endpoint);
  throwOnSupabaseError(error, 'Failed to delete push subscription');
}

export async function deletePushSubscriptionById(id: string) {
  const { error } = await supabase
    .from(TABLES.pushSubscription)
    .delete()
    .eq('id', id);
  throwOnSupabaseError(error, 'Failed to delete push subscription');
}

export async function getPushSubscriptionsForUser(userId: string) {
  const { data, error } = await supabase
    .from(TABLES.pushSubscription)
    .select('*')
    .eq('user_id', userId);
  throwOnSupabaseError(error, 'Failed to get push subscriptions');
  return (data ?? []).map(mapPushSubscriptionRow);
}

export async function getUserIdsWithModuleAccess(
  moduleKey: string,
): Promise<string[]> {
  const moduleKeysToCheck =
    moduleKey === 'daily-programme' || moduleKey === 'calendar'
      ? ['daily-programme', 'calendar']
      : [moduleKey];

  const { data: users, error: usersError } = await supabase
    .from(TABLES.user)
    .select('id, role_id');
  throwOnSupabaseError(usersError, 'Failed to get users');

  const { data: rolePerms, error: roleError } = await supabase
    .from(TABLES.roleModulePermissions)
    .select('role_id, module_key')
    .eq('has_access', true)
    .in('module_key', moduleKeysToCheck);
  throwOnSupabaseError(roleError, 'Failed to get role module permissions');

  const { data: userPerms, error: userPermError } = await supabase
    .from(TABLES.userModulePermissions)
    .select('userId')
    .eq('has_access', true)
    .in('module_key', moduleKeysToCheck);
  throwOnSupabaseError(userPermError, 'Failed to get user module permissions');

  const roleIdsWithAccess = new Set(
    (rolePerms ?? []).map((p) => String(p.role_id)),
  );

  const ids = new Set<string>();
  for (const u of users ?? []) {
    if (u.role_id && roleIdsWithAccess.has(String(u.role_id))) {
      ids.add(String(u.id));
    }
  }
  for (const row of userPerms ?? []) {
    ids.add(String(row.userId));
  }
  return Array.from(ids);
}

export async function deleteStaleSubscriptions(endpoints: string[]) {
  if (endpoints.length === 0) return;
  const { error } = await supabase
    .from(TABLES.pushSubscription)
    .delete()
    .in('endpoint', endpoints);
  throwOnSupabaseError(error, 'Failed to delete stale subscriptions');
}
