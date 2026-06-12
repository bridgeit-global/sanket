import { redirect } from 'next/navigation';

import { auth } from '@/app/(auth)/auth';
import { getAuthenticatedHomePath } from '@/lib/auth-home-path';

export default async function HomePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  redirect(
    await getAuthenticatedHomePath(
      session.user.id,
      session.user.defaultLandingModule,
    ),
  );
}
