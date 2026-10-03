import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { JobFairModule } from '@/components/job-fair/job-fair-module';
import { hasModuleAccess } from '@/lib/db/queries';
import { JOB_FAIR_MODULE_KEY } from '@/lib/job-fair/options';

export default async function JobFairPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const hasAccess = await hasModuleAccess(session.user.id, JOB_FAIR_MODULE_KEY);
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  const params = await searchParams;

  return (
    <div className="container mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-8">
      <JobFairModule initialCheckInCode={params.yuvaaz ?? null} />
    </div>
  );
}
