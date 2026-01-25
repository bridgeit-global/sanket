'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  Inbox,
  Send,
  FolderKanban,
  Building2,
  Briefcase,
  MessageSquare,
  Users,
  User as UserIcon,
  FileDown,
  Vote,
  MapPin,
} from 'lucide-react';
import { SidebarMenu, SidebarMenuItem } from '@/components/ui/sidebar';
import type { ModuleDefinition } from '@/lib/module-constants';
import { SidebarLink } from './sidebar-link';
import { useTranslations } from '@/hooks/use-translations';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'dashboard': LayoutDashboard,
  'daily-programme': CalendarDays,
  'back-office': Building2,
  'operator': Briefcase,
  'field-visitor': MapPin,
  'data-export': FileDown,
  'projects': FolderKanban,
  'inward': Inbox,
  'outward': Send,
  'voting-participation': Vote,
  'chat': MessageSquare,
  'user-management': Users,
  'profile': UserIcon,
};

// Define the desired order of modules
const MODULE_ORDER = [
  'dashboard',
  'daily-programme',
  'back-office',
  'operator',
  'field-visitor',
  'data-export',
  'projects',
  'inward',
  'outward',
  'voting-participation',
  'chat',
  'user-management',
  'profile',
];

// Sort modules according to the desired order
const sortModules = (mods: ModuleDefinition[]): ModuleDefinition[] => {
  return [...mods].sort((a, b) => {
    const indexA = MODULE_ORDER.indexOf(a.key);
    const indexB = MODULE_ORDER.indexOf(b.key);

    // If both are in the order list, sort by their position
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    // If only one is in the order list, prioritize it
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    // If neither is in the order list, maintain original order
    return 0;
  });
};

// Map module keys to translation keys
const getModuleTranslationKey = (moduleKey: string): string => {
  const keyMap: Record<string, string> = {
    'dashboard': 'modules.dashboard.label',
    'daily-programme': 'modules.dailyProgramme.label',
    'back-office': 'modules.backOffice.label',
    'operator': 'modules.operator.label',
    'field-visitor': 'modules.fieldVisitor.label',
    'data-export': 'modules.dataExport.label',
    'projects': 'modules.projects.label',
    'inward': 'modules.inward.label',
    'outward': 'modules.outward.label',
    'voting-participation': 'modules.votingParticipation.label',
    'chat': 'modules.chat.label',
    'user-management': 'modules.userManagement.label',
    'profile': 'modules.profile.label',
  };
  return keyMap[moduleKey] || moduleKey;
};

export function ModuleNavigation({
  user,
  modules: initialModules,
}: {
  user: { id?: string } | undefined;
  modules?: ModuleDefinition[];
}) {
  const pathname = usePathname();
  const { t } = useTranslations();
  const [modules, setModules] = useState<ModuleDefinition[]>(
    initialModules ? sortModules(initialModules) : [],
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
          setModules(sortModules(data));
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
        const translationKey = getModuleTranslationKey(module.key);
        const translatedLabel = t(translationKey);

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
              {translatedLabel}
            </SidebarLink>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

