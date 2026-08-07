import { auth } from '@/app/(auth)/auth';

/** Session gate for visitor APIs — allows visitor or operator module. */
export async function requireVisitorSession() {
  const session = await auth();
  const modules = (session?.user?.modules as string[]) || [];
  if (!session?.user || !(modules.includes('visitor') || modules.includes('operator'))) {
    return null;
  }
  return session;
}
