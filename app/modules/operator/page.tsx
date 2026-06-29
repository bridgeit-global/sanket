import dynamic from 'next/dynamic';
import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { hasModuleAccess } from '@/lib/db/queries';
import { Skeleton } from '@/components/ui/skeleton';
import { parseManageFiltersFromSearchParams } from '@/lib/operator/manage-url-params';

// Dynamically import the large BeneficiaryManagement component for code splitting
const BeneficiaryManagement = dynamic(
  () => import('@/components/operator-workflow').then((mod) => ({ default: mod.BeneficiaryManagement })),
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

export default async function OperatorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const hasAccess = await hasModuleAccess(session.user.id, 'operator');
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  const params = await searchParams;
  const initialTab: 'create' | 'manage' = params.tab === 'manage' ? 'manage' : 'create';
  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) urlParams.set(key, value);
  }
  const initialManageState = parseManageFiltersFromSearchParams(urlParams);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:py-8 max-w-7xl">
        <BeneficiaryManagement
          initialTab={initialTab}
          initialManageState={initialManageState}
          initialTaskId={params.taskId}
        />
      </div>
    </div>
  );
}

