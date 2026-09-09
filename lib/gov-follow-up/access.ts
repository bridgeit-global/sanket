import { auth } from '@/app/(auth)/auth';
import { hasModuleAccess } from '@/lib/db/queries';
import { GOV_FOLLOW_UP_MODULE_KEY } from '@/lib/gov-follow-up/constants';
import { NextResponse } from 'next/server';

export async function requireGovFollowUpAccess() {
  const session = await auth();
  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  const hasAccess = await hasModuleAccess(
    session.user.id,
    GOV_FOLLOW_UP_MODULE_KEY,
  );
  if (!hasAccess) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
  return { session, error: null };
}
