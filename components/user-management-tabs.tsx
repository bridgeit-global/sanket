'use client';

import { ModulePermissionManager } from '@/components/module-permission-manager';
import { RoleManager } from '@/components/role-manager';
import { FieldAssignmentManager } from '@/components/field-assignment-manager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslations } from '@/hooks/use-translations';

export function UserManagementTabs() {
  const { t } = useTranslations();

  return (
    <Tabs defaultValue="users" className="w-full">
      <TabsList className="grid w-full max-w-3xl grid-cols-3">
        <TabsTrigger value="users">{t('userManagement.users')}</TabsTrigger>
        <TabsTrigger value="roles">{t('userManagement.roles')}</TabsTrigger>
        <TabsTrigger value="field-assignments">{t('fieldAssignments.title')}</TabsTrigger>
      </TabsList>
      <TabsContent value="users" className="mt-6">
        <ModulePermissionManager />
      </TabsContent>
      <TabsContent value="roles" className="mt-6">
        <RoleManager />
      </TabsContent>
      <TabsContent value="field-assignments" className="mt-6">
        <FieldAssignmentManager />
      </TabsContent>
    </Tabs>
  );
}

