'use client';

import { SidebarToggle } from '@/components/sidebar-toggle';

interface ModulePageHeaderProps {
  title: string;
}

export function ModulePageHeader({ title }: ModulePageHeaderProps) {
  return (
    <header className="flex items-center gap-2 border-b px-4 py-2">
      <SidebarToggle />
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  );
}

