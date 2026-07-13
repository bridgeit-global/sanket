'use client';

import { useEffect, useMemo, useState } from 'react';
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
  Network,
  FileText,
  Landmark,
  BookOpenText,
} from 'lucide-react';
import { SidebarMenu, SidebarMenuItem } from '@/components/ui/sidebar';
import type { ModuleDefinition } from '@/lib/module-constants';
import {
  partitionModulesForNav,
  sortModulesByDisplayOrder,
} from '@/lib/module-constants';
import { SidebarLink } from './sidebar-link';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  'daily-programme': CalendarDays,
  'back-office': Building2,
  operator: Briefcase,
  'field-visitor': MapPin,
  'data-export': FileDown,
  projects: FolderKanban,
  adm: Landmark,
  'io-register': BookOpenText,
  inward: Inbox,
  outward: Send,
  'letter-generation': FileText,
  'voting-participation': Vote,
  chat: MessageSquare,
  'user-management': Users,
  profile: UserIcon,
  hierarchy: Network,
};

const getModuleTranslationKey = (moduleKey: string): string => {
  const keyMap: Record<string, string> = {
    dashboard: 'modules.dashboard.label',
    'daily-programme': 'modules.dailyProgramme.label',
    'back-office': 'modules.backOffice.label',
    operator: 'modules.operator.label',
    'field-visitor': 'modules.fieldVisitor.label',
    hierarchy: 'modules.hierarchy.label',
    'data-export': 'modules.dataExport.label',
    projects: 'modules.projects.label',
    adm: 'modules.adm.label',
    'io-register': 'modules.ioRegister.label',
    inward: 'modules.inward.label',
    outward: 'modules.outward.label',
    'letter-generation': 'modules.letterGeneration.label',
    'voting-participation': 'modules.votingParticipation.label',
    chat: 'modules.chat.label',
    'user-management': 'modules.userManagement.label',
    profile: 'modules.profile.label',
  };
  return keyMap[moduleKey] || moduleKey;
};

function ModuleNavItem({
  module,
  pathname,
  t,
}: {
  module: ModuleDefinition;
  pathname: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const Icon = iconMap[module.key];
  const isActive = pathname === module.route;
  const translatedLabel = t(getModuleTranslationKey(module.key));

  return (
    <SidebarMenuItem>
      <SidebarLink
        href={module.route}
        className={cn(
          'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-muted',
        )}
      >
        {Icon && <Icon className="size-4" />}
        {translatedLabel}
      </SidebarLink>
    </SidebarMenuItem>
  );
}

export function ModuleNavigation({
  user,
  modules: initialModules,
}: {
  user: { id?: string } | undefined;
  modules?: ModuleDefinition[];
}) {
  const pathname = usePathname();
  const { t } = useTranslations();
  const [modules, setModules] = useState<ModuleDefinition[]>(() =>
    initialModules ? sortModulesByDisplayOrder(initialModules) : [],
  );
  const [loading, setLoading] = useState(
    !(initialModules && initialModules.length > 0),
  );

  const { primary, more } = useMemo(
    () => partitionModulesForNav(modules),
    [modules],
  );

  useEffect(() => {
    if (initialModules && initialModules.length > 0) {
      setModules(sortModulesByDisplayOrder(initialModules));
      setLoading(false);
    }
  }, [initialModules, user?.id]);

  useEffect(() => {
    if ((initialModules && initialModules.length > 0) || !user?.id) {
      return;
    }

    const loadModules = async () => {
      try {
        const response = await fetch('/api/user/modules');
        if (response.ok) {
          const data = await response.json();
          setModules(sortModulesByDisplayOrder(data));
        }
      } catch (error) {
        console.error('Error loading modules:', error);
      } finally {
        setLoading(false);
      }
    };

    loadModules();
  }, [initialModules, user?.id]);

  if (loading || modules.length === 0) {
    return null;
  }

  const navItems = [...primary, ...more];

  return (
    <SidebarMenu>
      {navItems.map((module) => (
        <ModuleNavItem
          key={module.key}
          module={module}
          pathname={pathname}
          t={t}
        />
      ))}
    </SidebarMenu>
  );
}

export function ModuleNavigationPinned({
  modules: initialModules,
}: {
  modules?: ModuleDefinition[];
}) {
  const pathname = usePathname();
  const { t } = useTranslations();
  const [modules, setModules] = useState<ModuleDefinition[]>(() =>
    initialModules ? sortModulesByDisplayOrder(initialModules) : [],
  );

  useEffect(() => {
    if (initialModules) {
      setModules(sortModulesByDisplayOrder(initialModules));
    }
  }, [initialModules]);

  const { pinned } = useMemo(
    () => partitionModulesForNav(modules),
    [modules],
  );

  if (pinned.length === 0) {
    return null;
  }

  return (
    <SidebarMenu>
      {pinned.map((module) => (
        <ModuleNavItem
          key={module.key}
          module={module}
          pathname={pathname}
          t={t}
        />
      ))}
    </SidebarMenu>
  );
}
