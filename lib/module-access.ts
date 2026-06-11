import 'server-only';

import { supabase } from '@/lib/supabase/server';
import { throwOnSupabaseError } from '@/lib/db/errors';
import { TABLES } from './db/schema';
import { mapRoleModulePermissionRow, mapUserModulePermissionRow, mapUserRow } from './db/mappers';
import { ALL_MODULES, type ModuleDefinition } from './module-constants';

export { hasModuleAccess } from './db/queries';

export async function getUserAccessibleModules(
  userId: string,
): Promise<ModuleDefinition[]> {
  try {
    const { data: userData, error: userError } = await supabase
      .from(TABLES.user)
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    throwOnSupabaseError(userError, 'Failed to get user');

    if (!userData) {
      return [];
    }

    const userRecord = mapUserRow(userData);
    const accessibleKeys = new Set<string>();

    if (userRecord.roleId) {
      const { data: rolePermissions, error: roleError } = await supabase
        .from(TABLES.roleModulePermissions)
        .select('*')
        .eq('role_id', userRecord.roleId)
        .eq('has_access', true);
      throwOnSupabaseError(roleError, 'Failed to get role permissions');

      for (const perm of rolePermissions ?? []) {
        accessibleKeys.add(mapRoleModulePermissionRow(perm).moduleKey);
      }
    }

    const { data: userPermissions, error: permError } = await supabase
      .from(TABLES.userModulePermissions)
      .select('*')
      .eq('userId', userId)
      .eq('has_access', true);
    throwOnSupabaseError(permError, 'Failed to get user permissions');

    for (const perm of userPermissions ?? []) {
      accessibleKeys.add(mapUserModulePermissionRow(perm).moduleKey);
    }

    if (accessibleKeys.has('calendar')) {
      accessibleKeys.add('daily-programme');
    }

    return ALL_MODULES.filter((module) => accessibleKeys.has(module.key));
  } catch (error) {
    console.error('Error getting accessible modules:', error);
    return [];
  }
}

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

export async function hasAnyModuleAccess(
  userId: string,
  moduleKeys: string[],
): Promise<boolean> {
  if (moduleKeys.length === 0) return false;

  try {
    const accessible = await getUserAccessibleModules(userId);
    const accessibleKeys = new Set(accessible.map((mod) => mod.key));
    return moduleKeys.some((key) => accessibleKeys.has(key));
  } catch (error) {
    console.error('Error checking any module access:', error);
    return false;
  }
}

export async function getUserModulePermissions(
  userId: string,
): Promise<Record<string, boolean>> {
  try {
    const { data: userData, error: userError } = await supabase
      .from(TABLES.user)
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    throwOnSupabaseError(userError, 'Failed to get user');

    if (!userData) {
      return {};
    }

    const userRecord = mapUserRow(userData);
    const result: Record<string, boolean> = {};

    if (userRecord.roleId) {
      const { data: rolePermissions, error: roleError } = await supabase
        .from(TABLES.roleModulePermissions)
        .select('*')
        .eq('role_id', userRecord.roleId);
      throwOnSupabaseError(roleError, 'Failed to get role permissions');

      for (const perm of rolePermissions ?? []) {
        const mapped = mapRoleModulePermissionRow(perm);
        result[mapped.moduleKey] = mapped.hasAccess;
      }
    }

    const { data: userPermissions, error: permError } = await supabase
      .from(TABLES.userModulePermissions)
      .select('*')
      .eq('userId', userId);
    throwOnSupabaseError(permError, 'Failed to get user permissions');

    for (const perm of userPermissions ?? []) {
      const mapped = mapUserModulePermissionRow(perm);
      result[mapped.moduleKey] = mapped.hasAccess;
    }

    return result;
  } catch (error) {
    console.error('Error getting user module permissions:', error);
    return {};
  }
}
