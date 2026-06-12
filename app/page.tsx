import { redirect } from 'next/navigation';

import { LandingPage } from '@/components/landing-page';
import { auth } from './(auth)/auth';
import { getAuthenticatedHomePath } from '@/lib/auth-home-path';

export default async function Page() {
  const session = await auth();

  if (session?.user?.id) {
    redirect(
      await getAuthenticatedHomePath(
        session.user.id,
        session.user.defaultLandingModule,
      ),
    );
  }

  return <LandingPage />;
}
