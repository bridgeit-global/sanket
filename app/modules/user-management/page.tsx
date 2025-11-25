import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { ModulePermissionManager } from '@/components/module-permission-manager';
import { RoleManager } from '@/components/role-manager';
import { ModulePageHeader } from '@/components/module-page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { hasModuleAccess } from '@/lib/db/queries';

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
      <ModulePageHeader title="User Management" />
      <div className="container mx-auto p-4 sm:py-8 max-w-7xl flex-1">
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
          </TabsList>
          <TabsContent value="users" className="mt-6">
            <ModulePermissionManager />
          </TabsContent>
          <TabsContent value="roles" className="mt-6">
            <RoleManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

