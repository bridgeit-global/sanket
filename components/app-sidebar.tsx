'use client';

import type { User } from 'next-auth';
import { usePathname } from 'next/navigation';
import { ShieldCheck, type LucideIcon } from 'lucide-react';

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
import { cn } from '@/lib/utils';

interface AppSidebarProps {
  user: User | undefined;
  modules?: ModuleDefinition[];
}

const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0';

type AttendanceNavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive?: (pathname: string) => boolean;
};

const staffAttendanceLinks: AttendanceNavLink[] = [
  {
    href: '/dashboard',
    label: 'Attendance',
    icon: ShieldCheck,
    isActive: (path) => path === '/dashboard' || path === '/scan' || path.startsWith('/scan/'),
  },
];

const adminAttendanceLinks: AttendanceNavLink[] = [
  {
    href: '/admin/live-ops',
    label: 'Attendance',
    icon: ShieldCheck,
    isActive: (path) =>
      path.startsWith('/admin/live-ops') ||
      path.startsWith('/admin/qr-generator') ||
      path.startsWith('/admin/audit-logs'),
  },
  {
    href: '/admin/leave',
    label: 'Leave requests',
    icon: ShieldCheck,
    isActive: (path) => path.startsWith('/admin/leave'),
  },
];

function AttendanceNavGroup({
  label,
  links,
  pathname,
}: {
  label: string;
  links: AttendanceNavLink[];
  pathname: string;
}) {
  return (
    <div className="mb-4 border-b pb-4">
      <p className="px-3 pb-2 text-xs font-medium text-sidebar-foreground/70">{label}</p>
      <SidebarMenu>
        {links.map(({ href, label: linkLabel, icon: Icon, isActive: matchActive }) => {
          const isActive = matchActive ? matchActive(pathname) : pathname === href;
          return (
            <SidebarMenuItem key={href}>
              <SidebarLink
                href={href}
                className={cn(
                  'flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{linkLabel}</span>
              </SidebarLink>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </div>
  );
}

export function AppSidebar({ user, modules }: AppSidebarProps) {
  const { setOpenMobile } = useSidebar();
  const { t } = useTranslations();
  const pathname = usePathname();
  const isAdmin = user?.roleName === 'admin';

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
            isAdmin ? (
              <AttendanceNavGroup
                label="Attendance Admin"
                links={adminAttendanceLinks}
                pathname={pathname}
              />
            ) : (
              <AttendanceNavGroup
                label="Attendance"
                links={staffAttendanceLinks}
                pathname={pathname}
              />
            )
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
