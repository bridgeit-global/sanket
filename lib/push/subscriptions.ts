import 'server-only';

import { and, eq, inArray, or } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  pushSubscription,
  roleModulePermissions,
  user,
  userModulePermissions,
} from '@/lib/db/schema';

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
  const [existing] = await db
    .select()
    .from(pushSubscription)
    .where(eq(pushSubscription.endpoint, endpoint))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(pushSubscription)
      .set({
        userId,
        p256dh,
        auth,
        userAgent: userAgent ?? null,
        updatedAt: new Date(),
      })
      .where(eq(pushSubscription.endpoint, endpoint))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(pushSubscription)
    .values({
      userId,
      endpoint,
      p256dh,
      auth,
      userAgent: userAgent ?? null,
    })
    .returning();

  return created;
}

export async function deletePushSubscriptionByEndpoint(endpoint: string) {
  await db
    .delete(pushSubscription)
    .where(eq(pushSubscription.endpoint, endpoint));
}

export async function deletePushSubscriptionById(id: string) {
  await db.delete(pushSubscription).where(eq(pushSubscription.id, id));
}

export async function getPushSubscriptionsForUser(userId: string) {
  return db
    .select()
    .from(pushSubscription)
    .where(eq(pushSubscription.userId, userId));
}

export async function getUserIdsWithModuleAccess(
  moduleKey: string,
): Promise<string[]> {
  const moduleKeysToCheck =
    moduleKey === 'daily-programme' || moduleKey === 'calendar'
      ? ['daily-programme', 'calendar']
      : [moduleKey];

  const roleUserIds = await db
    .select({ userId: user.id })
    .from(user)
    .innerJoin(
      roleModulePermissions,
      and(
        eq(roleModulePermissions.roleId, user.roleId),
        eq(roleModulePermissions.hasAccess, true),
        inArray(roleModulePermissions.moduleKey, moduleKeysToCheck),
      ),
    );

  const directUserIds = await db
    .select({ userId: userModulePermissions.userId })
    .from(userModulePermissions)
    .where(
      and(
        eq(userModulePermissions.hasAccess, true),
        inArray(userModulePermissions.moduleKey, moduleKeysToCheck),
      ),
    );

  const ids = new Set<string>();
  for (const row of roleUserIds) ids.add(row.userId);
  for (const row of directUserIds) ids.add(row.userId);
  return Array.from(ids);
}

export async function deleteStaleSubscriptions(endpoints: string[]) {
  if (endpoints.length === 0) return;
  await db
    .delete(pushSubscription)
    .where(
      or(...endpoints.map((endpoint) => eq(pushSubscription.endpoint, endpoint))),
    );
}
