'use client';

import { SidebarToggle } from '@/components/sidebar-toggle';
import type { ReactNode } from 'react';

interface ModulePageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function ModulePageHeader({ 
  title, 
  description, 
  actions,
  className = '' 
}: ModulePageHeaderProps) {
  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between no-print ${className}`}>
      <div className="flex min-w-0 items-start gap-3">
        <SidebarToggle />
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {actions}
        </div>
      )}
    </div>
  );
}

