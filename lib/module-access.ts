import 'server-only';

import { eq, and } from 'drizzle-orm';
import { db } from './db/queries';
import { userModulePermissions, user, roleModulePermissions, role } from './db/schema';
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
    // Get user record with roleId
    const [userRecord] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!userRecord) {
      return [];
    }

    const accessibleKeys = new Set<string>();

    // First, check role-based permissions if user has a roleId
    if (userRecord.roleId) {
      const rolePermissions = await db
        .select()
        .from(roleModulePermissions)
        .where(
          and(
            eq(roleModulePermissions.roleId, userRecord.roleId),
            eq(roleModulePermissions.hasAccess, true),
          ),
        );

      for (const perm of rolePermissions) {
        accessibleKeys.add(perm.moduleKey);
      }
    }

    // Then, get explicit user-specific permissions (for backward compatibility/overrides)
    const userPermissions = await db
      .select()
      .from(userModulePermissions)
      .where(
        and(
          eq(userModulePermissions.userId, userId),
          eq(userModulePermissions.hasAccess, true),
        ),
      );

    for (const perm of userPermissions) {
      accessibleKeys.add(perm.moduleKey);
    }

    // Special case: if calendar access, also grant daily-programme access
    if (accessibleKeys.has('calendar')) {
      accessibleKeys.add('daily-programme');
    }

    // Fallback: Also include modules where the user's role enum is in defaultRoles
    // (for backward compatibility during migration)
    const userRole = userRecord.role;
    if (userRole) {
      for (const module of ALL_MODULES) {
        if (module.defaultRoles.length > 0 && module.defaultRoles.includes(userRole as 'admin' | 'operator' | 'back-office' | 'regular')) {
          accessibleKeys.add(module.key);
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
    const [userRecord] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!userRecord) {
      return false;
    }

    const accessibleKeys = new Set<string>();

    // Check role-based permissions if user has a roleId
    if (userRecord.roleId) {
      const rolePermissions = await db
        .select()
        .from(roleModulePermissions)
        .where(
          and(
            eq(roleModulePermissions.roleId, userRecord.roleId),
            eq(roleModulePermissions.hasAccess, true),
          ),
        );

      for (const perm of rolePermissions) {
        accessibleKeys.add(perm.moduleKey);
      }
    }

    // Check user-specific permissions
    const userPermissions = await db
      .select()
      .from(userModulePermissions)
      .where(
        and(
          eq(userModulePermissions.userId, userId),
          eq(userModulePermissions.hasAccess, true),
        ),
      );

    for (const perm of userPermissions) {
      accessibleKeys.add(perm.moduleKey);
    }

    return moduleKeys.some((key) => accessibleKeys.has(key));
  } catch (error) {
    console.error('Error checking any module access:', error);
    return false;
  }
}

/**
 * Get all module permissions for a user (from role and user-specific overrides)
 */
export async function getUserModulePermissions(
  userId: string,
): Promise<Record<string, boolean>> {
  try {
    const [userRecord] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!userRecord) {
      return {};
    }

    const result: Record<string, boolean> = {};

    // Get role-based permissions if user has a roleId
    if (userRecord.roleId) {
      const rolePermissions = await db
        .select()
        .from(roleModulePermissions)
        .where(eq(roleModulePermissions.roleId, userRecord.roleId));

      for (const perm of rolePermissions) {
        result[perm.moduleKey] = perm.hasAccess;
      }
    }

    // Get user-specific permissions (these can override role permissions)
    const userPermissions = await db
      .select()
      .from(userModulePermissions)
      .where(eq(userModulePermissions.userId, userId));

    for (const perm of userPermissions) {
      result[perm.moduleKey] = perm.hasAccess;
    }

    return result;
  } catch (error) {
    console.error('Error getting user module permissions:', error);
    return {};
  }
}

