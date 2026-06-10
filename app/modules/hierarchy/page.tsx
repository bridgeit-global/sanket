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
    <div className="container mx-auto p-4 sm:py-8 max-w-7xl">
      <HierarchyModule isAdmin={isAdmin} />
    </div>
  );
}
