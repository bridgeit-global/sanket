'use client';

import type { User } from 'next-auth';
import { Activity, ScanLine, ShieldCheck } from 'lucide-react';

import { NotificationBell } from '@/components/notification-bell';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import type { ModuleDefinition } from '@/lib/module-constants';
import { ModuleNavigation, ModuleNavigationPinned } from './module-navigation';
import { SidebarLink } from './sidebar-link';
import { useTranslations } from '@/hooks/use-translations';

interface AppSidebarProps {
  user: User | undefined;
  modules?: ModuleDefinition[];
}

const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0';

export function AppSidebar({ user, modules }: AppSidebarProps) {
  const { setOpenMobile } = useSidebar();
  const { t } = useTranslations();

  return (
    <Sidebar className="group-data-[side=left]:border-r-0">
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row items-center justify-between gap-1">
            <Link
              href="/"
              onClick={() => {
                setOpenMobile(false);
              }}
              className="flex min-w-0 flex-row gap-3 items-center"
            >
              <span className="text-lg font-semibold px-2 hover:bg-muted rounded-md cursor-pointer truncate">
                {t('sidebar.title')}
              </span>
            </Link>
            <div className="flex shrink-0 items-center gap-0.5 px-1">
              {user ? <NotificationBell /> : null}
              <span className="text-xs text-muted-foreground px-1">
                {t('sidebar.version')} {appVersion}
              </span>
            </div>
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="flex flex-col">
        <div className="flex-1 px-2 py-4">
          {user ? (
            <SidebarMenu className="mb-4 border-b pb-4">
              <SidebarMenuItem>
                <SidebarLink
                  href="/dashboard"
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                >
                  <ShieldCheck className="size-4" />
                  Vigil Attendance
                </SidebarLink>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarLink
                  href="/scan"
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                >
                  <ScanLine className="size-4" />
                  Scan Attendance
                </SidebarLink>
              </SidebarMenuItem>
              {user.roleName === 'admin' ? (
                <SidebarMenuItem>
                  <SidebarLink
                    href="/admin/live-ops"
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    <Activity className="size-4" />
                    Vigil Live Operations
                  </SidebarLink>
                </SidebarMenuItem>
              ) : null}
            </SidebarMenu>
          ) : null}
          <SidebarMenu>
            <ModuleNavigation user={user} modules={modules} />
          </SidebarMenu>
        </div>
        <div className="px-2 pb-2">
          <Separator className="mb-2" />
          <ModuleNavigationPinned modules={modules} />
        </div>
      </SidebarContent>
      <SidebarFooter>{user && <SidebarUserNav user={user} />}</SidebarFooter>
    </Sidebar>
  );
}
