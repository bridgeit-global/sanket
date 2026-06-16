import { auth } from '@/app/(auth)/auth';
import { hasModuleAccess } from '@/lib/db/queries';

export async function requireHierarchyAccess(write = false) {
  const session = await auth();
  if (!session?.user) {
    return { error: 'Unauthorized', status: 401 as const };
  }

  const hasAccess = await hasModuleAccess(session.user.id, 'hierarchy');
  if (!hasAccess) {
    return { error: 'Forbidden', status: 403 as const };
  }

  return { session, userId: session.user.id };
}
