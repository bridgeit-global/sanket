import 'server-only';

import { eq, and } from 'drizzle-orm';
import { db } from './db/queries';
import { userModulePermissions, user } from './db/schema';
import { ALL_MODULES, type ModuleDefinition } from './module-constants';

// Re-export hasModuleAccess from queries for convenience
export { hasModuleAccess } from './db/queries';

/**
 * Get all modules that a user has access to
 */
export async function getUserAccessibleModules(
  userId: string,
): Promise<ModuleDefinition[]> {
  try {
    // Get user role first
    const [userRecord] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    const userRole = userRecord?.role;

    // Get explicit permissions from database
    const permissions = await db
      .select()
      .from(userModulePermissions)
      .where(
        and(
          eq(userModulePermissions.userId, userId),
          eq(userModulePermissions.hasAccess, true),
        ),
      );

    const accessibleKeys = new Set(permissions.map((p) => p.moduleKey));
    if (accessibleKeys.has('calendar')) {
      accessibleKeys.add('daily-programme');
    }

    // Also include modules where the user's role is in defaultRoles
    if (userRole) {
      for (const modules of ALL_MODULES) {
        if (modules.defaultRoles.length > 0 && modules.defaultRoles.includes(userRole as 'admin' | 'operator' | 'back-office' | 'regular')) {
          accessibleKeys.add(modules.key);
        }
      }
    }

    return ALL_MODULES.filter((module) => accessibleKeys.has(module.key));
  } catch (error) {
    console.error('Error getting accessible modules:', error);
    return [];
  }
}

/**
 * Get modules grouped by category for a user
 */
export async function getModulesByCategoryForUser(
  userId: string,
): Promise<Record<string, ModuleDefinition[]>> {
  const accessibleModules = await getUserAccessibleModules(userId);
  const grouped: Record<string, ModuleDefinition[]> = {};

  for (const mod of accessibleModules) {
    if (!grouped[mod.category]) {
      grouped[mod.category] = [];
    }
    grouped[mod.category].push(mod);
  }

  return grouped;
}

/**
 * Check if user has access to any of the provided modules
 */
export async function hasAnyModuleAccess(
  userId: string,
  moduleKeys: string[],
): Promise<boolean> {
  if (moduleKeys.length === 0) return false;

  try {
    const permissions = await db
      .select()
      .from(userModulePermissions)
      .where(
        and(
          eq(userModulePermissions.userId, userId),
          eq(userModulePermissions.hasAccess, true),
        ),
      );

    const accessibleKeys = new Set(permissions.map((p) => p.moduleKey));
    return moduleKeys.some((key) => accessibleKeys.has(key));
  } catch (error) {
    console.error('Error checking any module access:', error);
    return false;
  }
}

/**
 * Get all module permissions for a user
 */
export async function getUserModulePermissions(
  userId: string,
): Promise<Record<string, boolean>> {
  try {
    const permissions = await db
      .select()
      .from(userModulePermissions)
      .where(eq(userModulePermissions.userId, userId));

    const result: Record<string, boolean> = {};
    for (const perm of permissions) {
      result[perm.moduleKey] = perm.hasAccess;
    }
    return result;
  } catch (error) {
    console.error('Error getting user module permissions:', error);
    return {};
  }
}

