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
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between no-print ${className}`}>
      <div className="flex items-center gap-3">
        <SidebarToggle />
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

