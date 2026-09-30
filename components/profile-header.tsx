'use client';

import { ModulePageHeader } from '@/components/module-page-header';

export function ProfileHeader() {
  return (
    <ModulePageHeader
      title="Profile"
      description="View your account and update your password"
      className="mb-4 md:mb-6"
    />
  );
}
