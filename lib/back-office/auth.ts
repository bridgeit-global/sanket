import 'server-only';

import { auth } from '@/app/(auth)/auth';

export async function requireBackOfficeSession() {
  const session = await auth();
  const modules = (session?.user?.modules as string[]) || [];
  if (!session?.user || !modules.includes('back-office')) {
    return null;
  }
  return session;
}
