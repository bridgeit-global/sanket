import { Suspense } from 'react';
import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { hasModuleAccess } from '@/lib/db/queries';
import { GOV_FOLLOW_UP_MODULE_KEY } from '@/lib/gov-follow-up/constants';
import { GovFollowUpDesk } from '@/components/gov-follow-up/gov-follow-up-desk';
import { TableSkeleton } from '@/components/module-skeleton';

export default async function GovFollowUpPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const hasAccess = await hasModuleAccess(
    session.user.id,
    GOV_FOLLOW_UP_MODULE_KEY,
  );
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  return (
    <div className="container mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-8">
      <Suspense fallback={<TableSkeleton rows={8} />}>
        <GovFollowUpDesk />
      </Suspense>
    </div>
  );
}
