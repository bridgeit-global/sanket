'use client';

import { SidebarToggle } from '@/components/sidebar-toggle';

export function ProfileHeader() {
  return (
    <div className="flex items-center gap-3 mb-6">
      <SidebarToggle />
    </div>
  );
}
