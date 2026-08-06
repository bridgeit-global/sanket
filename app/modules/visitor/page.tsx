import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/app/(auth)/auth';
import { hasModuleAccess } from '@/lib/db/queries';
import { Skeleton } from '@/components/ui/skeleton';
import {
  parseVisitorManageFiltersFromSearchParams,
  type VisitorManageFilterState,
} from '@/lib/visitor/manage-url-params';

type VisitorWorkflowProps = {
  initialTab?: 'create' | 'manage';
  initialManageState?: Partial<VisitorManageFilterState>;
};

const VisitorWorkflow = dynamic(
  () =>
    import('@/components/visitor-workflow').then((mod) => ({
      default: mod.VisitorWorkflow,
    })),
  {
    loading: () => (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    ),
    ssr: true,
  },
) as ComponentType<VisitorWorkflowProps>;

export default async function VisitorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const hasAccess = await hasModuleAccess(session.user.id, 'visitor');
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  const params = await searchParams;
  const initialTab: 'create' | 'manage' = params.tab === 'manage' ? 'manage' : 'create';
  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) urlParams.set(key, value);
  }
  const initialManageState = parseVisitorManageFiltersFromSearchParams(urlParams);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl p-4 sm:py-8">
        <VisitorWorkflow
          initialTab={initialTab}
          initialManageState={initialManageState}
        />
      </div>
    </div>
  );
}
