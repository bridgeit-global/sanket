import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { DailyProgramme } from '@/components/daily-programme';
import { hasModuleAccess } from '@/lib/db/queries';

export default async function DailyProgrammePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const hasAccess = await hasModuleAccess(
    session.user.id,
    'daily-programme',
  );
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  return (
    <div className="container mx-auto p-4 sm:py-8 max-w-7xl">
      <DailyProgramme userRole={session.user.role} />
    </div>
  );
}

