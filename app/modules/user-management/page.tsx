import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { hasModuleAccess } from '@/lib/db/queries';
import { UserManagementTabs } from '@/components/user-management-tabs';
import { UserManagementHeader } from '@/components/user-management-header';

export default async function UserManagementPage() {
  console.log('user-management')
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const hasAccess = await hasModuleAccess(session.user.id, 'user-management');
  console.log('hasAccess', hasAccess)

  if (!hasAccess) {
    redirect('/unauthorized');
  }

  return (
    <div className="flex flex-col min-h-screen">
      <UserManagementHeader />
      <div className="container mx-auto p-4 sm:py-8 max-w-7xl flex-1">
        <UserManagementTabs />
      </div>
    </div>
  );
}

