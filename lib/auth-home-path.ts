import { getUserAccessibleModules } from './module-access';

const PRIORITY_MODULES = [
  'chat',
  'dashboard',
  'operator',
  'back-office',
  'daily-programme',
] as const;

export function getHomePathFromModules(
  moduleKeys: string[],
  defaultLandingModule?: string | null,
): string {
  if (defaultLandingModule && moduleKeys.includes(defaultLandingModule)) {
    return `/modules/${defaultLandingModule}`;
  }

  for (const moduleKey of PRIORITY_MODULES) {
    if (moduleKeys.includes(moduleKey)) {
      return `/modules/${moduleKey}`;
    }
  }

  if (moduleKeys.length > 0) {
    return `/modules/${moduleKeys[0]}`;
  }

  return '/unauthorized';
}

export async function getAuthenticatedHomePath(
  userId: string,
  defaultLandingModule?: string | null,
): Promise<string> {
  const modules = await getUserAccessibleModules(userId);

  if (defaultLandingModule) {
    const defaultModule = modules.find((m) => m.key === defaultLandingModule);
    if (defaultModule) {
      return defaultModule.route;
    }
  }

  for (const moduleKey of PRIORITY_MODULES) {
    const accessibleModule = modules.find((m) => m.key === moduleKey);
    if (accessibleModule) {
      return accessibleModule.route;
    }
  }

  return '/modules/profile';
}
