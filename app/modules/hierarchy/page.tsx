import { Suspense } from 'react';
import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { hasModuleAccess } from '@/lib/db/queries';
import { isUserAdmin } from '@/lib/db/cadre-queries';
import { HierarchyModule } from '@/components/hierarchy/hierarchy-module';

export default async function HierarchyPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const hasAccess = await hasModuleAccess(session.user.id, 'hierarchy');
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  const isAdmin = await isUserAdmin(session.user.id);

  return (
    <div className="mx-auto flex h-[100dvh] w-full min-h-0 flex-col overflow-hidden p-3 sm:p-4 sm:py-6">
      <Suspense
        fallback={
          <p className="text-muted-foreground flex flex-1 items-center justify-center py-12 text-center">
            Loading...
          </p>
        }
      >
        <HierarchyModule canEdit={hasAccess} isAdmin={isAdmin} />
      </Suspense>
    </div>
  );
}
