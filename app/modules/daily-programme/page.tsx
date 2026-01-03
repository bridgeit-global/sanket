import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { hasModuleAccess, getDailyProgrammeItems } from '@/lib/db/queries';
import { startOfToday } from 'date-fns';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

// Dynamically import the large DailyProgramme component for code splitting
const DailyProgramme = dynamic(
  () => import('@/components/daily-programme').then((mod) => ({ default: mod.DailyProgramme })),
  {
    loading: () => (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    ),
    ssr: true,
  }
);

async function DailyProgrammeDataLoader({
  userRole,
}: {
  userRole: string;
}) {
  // Prefetch initial data for today's date range
  const today = startOfToday();
  const todayStr = format(today, 'yyyy-MM-dd');
  
  const initialItems = await getDailyProgrammeItems({
    startDate: todayStr,
    endDate: todayStr,
  });

  return (
    <DailyProgramme
      userRole={userRole}
      initialItems={initialItems}
      initialDateRange={{ start: todayStr, end: todayStr }}
    />
  );
}

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
      <Suspense fallback={<div>Loading...</div>}>
        <DailyProgrammeDataLoader
          userRole={session.user.roleName || 'regular'}
        />
      </Suspense>
    </div>
  );
}

