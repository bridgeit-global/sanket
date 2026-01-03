import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { hasModuleAccess } from '@/lib/db/queries';
import { auth } from '@/app/(auth)/auth';
import { DashboardContent } from '@/components/dashboard-content';
import { DashboardSkeleton } from '@/components/module-skeleton';
import { getDashboardData } from '@/lib/db/dashboard-queries';

async function DashboardDataLoader() {
  const data = await getDashboardData();
  return <DashboardContent data={data} />;
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const hasAccess = await hasModuleAccess(session.user.id, 'dashboard');
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  return (
    <div className="container mx-auto p-4 sm:py-8 max-w-7xl">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardDataLoader />
      </Suspense>
    </div>
  );
}

