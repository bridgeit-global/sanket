import dynamic from 'next/dynamic';
import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { hasModuleAccess } from '@/lib/db/queries';
import { Skeleton } from '@/components/ui/skeleton';

// Dynamically import the large VisitorManagement component for code splitting
const VisitorManagement = dynamic(
  () => import('@/components/visitor-management').then((mod) => ({ default: mod.VisitorManagement })),
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

export default async function VisitorManagementPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const hasAccess = await hasModuleAccess(
    session.user.id,
    'visitor-management',
  );
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  return (
    <div className="container mx-auto p-4 sm:py-8 max-w-7xl">
      <VisitorManagement userRole={session.user.roleName || 'regular'} />
    </div>
  );
}

