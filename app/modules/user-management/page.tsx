import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { ModulePermissionManager } from '@/components/module-permission-manager';
import { ModulePageHeader } from '@/components/module-page-header';

export default async function UserManagementPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role !== 'admin') {
    redirect('/unauthorized');
  }

  return (
    <div className="flex flex-col min-h-screen">
      <ModulePageHeader title="User Management" />
      <div className="container mx-auto p-4 sm:py-8 max-w-7xl flex-1">
        <ModulePermissionManager />
      </div>
    </div>
  );
}

