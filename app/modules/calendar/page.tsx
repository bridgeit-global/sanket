import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { hasModuleAccess } from '@/lib/db/queries';

export default async function CalendarRedirectPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const hasAccess = await hasModuleAccess(session.user.id, 'daily-programme');
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  redirect('/modules/daily-programme');
}

