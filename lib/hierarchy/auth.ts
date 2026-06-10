import { auth } from '@/app/(auth)/auth';
import { hasModuleAccess } from '@/lib/db/queries';
import { isUserAdmin } from '@/lib/db/cadre-queries';

export async function requireHierarchyAccess(write = false) {
  const session = await auth();
  if (!session?.user) {
    return { error: 'Unauthorized', status: 401 as const };
  }

  const hasAccess = await hasModuleAccess(session.user.id, 'hierarchy');
  if (!hasAccess) {
    return { error: 'Forbidden', status: 403 as const };
  }

  if (write) {
    const admin = await isUserAdmin(session.user.id);
    if (!admin) {
      return { error: 'Admin access required', status: 403 as const };
    }
  }

  return { session, userId: session.user.id };
}
