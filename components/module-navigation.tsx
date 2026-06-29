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
  ChevronDown,
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
  inward: Inbox,
  outward: Send,
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
    inward: 'modules.inward.label',
    outward: 'modules.outward.label',
    'voting-participation': 'modules.votingParticipation.label',
    chat: 'modules.chat.label',
    'user-management': 'modules.userManagement.label',
    profile: 'modules.profile.label',
  };
  return keyMap[moduleKey] || moduleKey;
};

const MORE_OPEN_STORAGE_KEY = 'sidebar:more-open';

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
  const [moreOpen, setMoreOpen] = useState(false);

  const { primary, more, pinned, useFlatList } = useMemo(
    () => partitionModulesForNav(modules),
    [modules],
  );

  const moreContainsActive = more.some((m) => m.route === pathname);

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

  useEffect(() => {
    if (useFlatList) return;
    if (moreContainsActive) {
      setMoreOpen(true);
      return;
    }
    try {
      const stored = localStorage.getItem(MORE_OPEN_STORAGE_KEY);
      if (stored === 'true') setMoreOpen(true);
    } catch {
      // ignore
    }
  }, [useFlatList, moreContainsActive]);

  const toggleMore = () => {
    setMoreOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(MORE_OPEN_STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  if (loading || modules.length === 0) {
    return null;
  }

  if (useFlatList) {
    return (
      <SidebarMenu>
        {primary.map((module) => (
          <ModuleNavItem
            key={module.key}
            module={module}
            pathname={pathname}
            t={t}
          />
        ))}
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

  return (
    <>
      <SidebarMenu>
        {primary.map((module) => (
          <ModuleNavItem
            key={module.key}
            module={module}
            pathname={pathname}
            t={t}
          />
        ))}
      </SidebarMenu>

      {more.length > 0 && (
        <div className="mt-1">
          <button
            type="button"
            onClick={toggleMore}
            className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <span>{t('sidebar.moreCount', { count: more.length })}</span>
            <ChevronDown
              className={cn(
                'size-4 shrink-0 transition-transform',
                moreOpen && 'rotate-180',
              )}
            />
          </button>
          {moreOpen && (
            <SidebarMenu className="mt-1">
              {more.map((module) => (
                <ModuleNavItem
                  key={module.key}
                  module={module}
                  pathname={pathname}
                  t={t}
                />
              ))}
            </SidebarMenu>
          )}
        </div>
      )}
    </>
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

  const { pinned, useFlatList } = useMemo(
    () => partitionModulesForNav(modules),
    [modules],
  );

  if (useFlatList || pinned.length === 0) {
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
