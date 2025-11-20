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
import type { ModuleDefinition } from '@/lib/module-constants';
import { SidebarLink } from './sidebar-link';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'mla-dashboard': LayoutDashboard,
  'daily-programme': CalendarDays,
  inward: Inbox,
  outward: Send,
  projects: FolderKanban,
};
const MLA_MODULE_KEYS = ['mla-dashboard', 'daily-programme', 'inward', 'outward', 'projects'];

const filterMlaModules = (mods: ModuleDefinition[]) =>
  mods.filter((m) => MLA_MODULE_KEYS.includes(m.key));

export function ModuleNavigation({
  user,
  modules: initialModules,
}: {
  user: { id?: string } | undefined;
  modules?: ModuleDefinition[];
}) {
  const pathname = usePathname();
  const [modules, setModules] = useState<ModuleDefinition[]>(
    initialModules ? filterMlaModules(initialModules) : [],
  );
  const [loading, setLoading] = useState(!(initialModules && initialModules.length > 0));

  useEffect(() => {
    if (modules.length > 0 || !user?.id) {
      setLoading(false);
      return;
    }

    const loadModules = async () => {
      try {
        const response = await fetch('/api/user/modules');
        if (response.ok) {
          const data = await response.json();
          setModules(filterMlaModules(data));
        }
      } catch (error) {
        console.error('Error loading modules:', error);
      } finally {
        setLoading(false);
      }
    };

    loadModules();
  }, [modules.length, user?.id]);

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
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive
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

