import 'server-only';

import { hasModuleAccess } from '@/lib/db/queries';

/** ADM staff and beneficiary operators can upload and link these letters. */
export async function canAccessFundRequestLetters(
  userId: string,
): Promise<boolean> {
  const [adm, operator] = await Promise.all([
    hasModuleAccess(userId, 'adm'),
    hasModuleAccess(userId, 'operator'),
  ]);
  return adm || operator;
}
