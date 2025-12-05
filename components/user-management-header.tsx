'use client';

import { ModulePageHeader } from '@/components/module-page-header';
import { useTranslations } from '@/hooks/use-translations';

export function UserManagementHeader() {
  const { t } = useTranslations();

  return (
    <ModulePageHeader 
      title={t('userManagement.title')}
      description={t('userManagement.description')}
    />
  );
}

