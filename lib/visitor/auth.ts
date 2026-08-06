import { auth } from '@/app/(auth)/auth';

export async function requireVisitorSession() {
  const session = await auth();
  const modules = (session?.user?.modules as string[]) || [];
  if (!session?.user || !modules.includes('visitor')) {
    return null;
  }
  return session;
}
