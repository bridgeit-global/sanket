import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { VisitorManagement } from '@/components/visitor-management';
import { hasModuleAccess } from '@/lib/db/queries';

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

