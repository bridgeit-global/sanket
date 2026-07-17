import { hasModuleAccess } from '@/lib/db/queries';

/** Inward register read/create for clerks, plus ADM users linking sanction orders. */
export async function canAccessInwardRegister(userId: string): Promise<boolean> {
  const [hasInward, hasAdm] = await Promise.all([
    hasModuleAccess(userId, 'inward'),
    hasModuleAccess(userId, 'adm'),
  ]);
  return hasInward || hasAdm;
}
