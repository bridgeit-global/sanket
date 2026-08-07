import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/app/(auth)/auth';
import { hasModuleAccess } from '@/lib/db/queries';
import { Skeleton } from '@/components/ui/skeleton';
import { parseManageFiltersFromSearchParams } from '@/lib/operator/manage-url-params';

type VisitorWorkflowProps = {
  initialTab?: 'visitor' | 'create' | 'tasks' | 'manage';
  initialTaskId?: string;
  initialTaskManageState?: ReturnType<typeof parseManageFiltersFromSearchParams>;
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

function resolveVisitorTab(
  tab: string | undefined,
  hasTaskDeepLink: boolean,
): 'visitor' | 'create' | 'tasks' {
  if (hasTaskDeepLink || tab === 'tasks' || tab === 'manage') return 'tasks';
  if (tab === 'create' || tab === 'visitor') return tab;
  return 'visitor';
}

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
  const beneficiaryTaskId = params.taskId ?? params.serviceId;
  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) urlParams.set(key, value);
  }
  const initialTaskManageState = parseManageFiltersFromSearchParams(urlParams);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl p-4 sm:py-8">
        <VisitorWorkflow
          initialTab={resolveVisitorTab(params.tab, Boolean(beneficiaryTaskId))}
          initialTaskId={beneficiaryTaskId}
          initialTaskManageState={initialTaskManageState}
        />
      </div>
    </div>
  );
}
