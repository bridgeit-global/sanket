'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  Inbox,
  Send,
  FolderKanban,
} from 'lucide-react';
import { SidebarMenu, SidebarMenuItem } from '@/components/ui/sidebar';
import { getUserAccessibleModules } from '@/lib/module-access';
import type { ModuleDefinition } from '@/lib/module-constants';
import { SidebarLink } from './sidebar-link';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'mla-dashboard': LayoutDashboard,
  'daily-programme': CalendarDays,
  inward: Inbox,
  outward: Send,
  projects: FolderKanban,
};

export function ModuleNavigation({ user }: { user: { id: string } | undefined }) {
  const pathname = usePathname();
  const [modules, setModules] = useState<ModuleDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadModules();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const loadModules = async () => {
    try {
      // Fetch user's accessible modules from API
      const response = await fetch('/api/user/modules');
      if (response.ok) {
        const data = await response.json();
        // Filter only MLA e-Office modules
        const mlaModules = data.filter((m: ModuleDefinition) =>
          ['mla-dashboard', 'daily-programme', 'inward', 'outward', 'projects'].includes(
            m.key,
          ),
        );
        setModules(mlaModules);
      }
    } catch (error) {
      console.error('Error loading modules:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || modules.length === 0) {
    return null;
  }

  return (
    <SidebarMenu>
      {modules.map((module) => {
        const Icon = iconMap[module.key];
        const isActive = pathname === module.route;

        return (
          <SidebarMenuItem key={module.key}>
            <SidebarLink
              href={module.route}
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              {Icon && <Icon className="size-4" />}
              {module.label}
            </SidebarLink>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

