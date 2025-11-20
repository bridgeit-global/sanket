'use client';

import type { User } from 'next-auth';
import { useRouter } from 'next/navigation';

import { PlusIcon } from '@/components/icons';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import type { ModuleDefinition } from '@/lib/module-constants';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { ModuleNavigation } from './module-navigation';
import { SidebarLink } from './sidebar-link';
import {
  Calendar,
  MessageSquare,
  Briefcase,
  Building2,
  User as UserIcon,
  Users,
} from 'lucide-react';

interface AppSidebarProps {
  user: User | undefined;
  modules?: ModuleDefinition[];
}

export function AppSidebar({ user, modules }: AppSidebarProps) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const hasModuleData = Array.isArray(modules);
  const accessibleModuleKeys = new Set((modules ?? []).map((module) => module.key));
  const canAccessModule = (key: string) =>
    !hasModuleData || accessibleModuleKeys.has(key);

  return (
    <Sidebar className="group-data-[side=left]:border-r-0">
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row justify-between items-center">
            <Link
              href="/"
              onClick={() => {
                setOpenMobile(false);
              }}
              className="flex flex-row gap-3 items-center"
            >
              <span className="text-lg font-semibold px-2 hover:bg-muted rounded-md cursor-pointer">
                Sanket
              </span>
            </Link>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  type="button"
                  className="p-2 h-fit"
                  onClick={() => {
                    setOpenMobile(false);
                    router.push('/');
                    router.refresh();
                  }}
                >
                  <PlusIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent align="end">New Chat</TooltipContent>
            </Tooltip>
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* Navigation Menu */}
        <div className="px-2 py-4">
          <SidebarMenu>
            {/* System Modules */}
            {user && user.role === 'admin' && canAccessModule('user-management') && (
              <SidebarMenuItem>
                <SidebarLink
                  href="/modules/user-management"
                  className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors"
                >
                  <Users className="size-4" />
                  User Management
                </SidebarLink>
              </SidebarMenuItem>
            )}
            {canAccessModule('profile') && (
              <SidebarMenuItem>
                <SidebarLink
                  href="/modules/profile"
                  className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors"
                >
                  <UserIcon className="size-4" />
                  Profile
                </SidebarLink>
              </SidebarMenuItem>
            )}

            {/* Analytics */}
            {user && user.role === 'admin' && canAccessModule('chat') && (
              <SidebarMenuItem>
                <SidebarLink
                  href="/modules/chat"
                  className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors"
                >
                  <MessageSquare className="size-4" />
                  Chat / Analytics
                </SidebarLink>
              </SidebarMenuItem>
            )}

            {/* Operations */}
            {user &&
              ['admin', 'operator', 'back-office'].includes(user.role) &&
              canAccessModule('operator') && (
                <SidebarMenuItem>
                  <SidebarLink
                    href="/modules/operator"
                    className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors"
                  >
                    <Briefcase className="size-4" />
                    Operator
                  </SidebarLink>
                </SidebarMenuItem>
              )}
            {user &&
              ['admin', 'back-office'].includes(user.role) &&
              canAccessModule('back-office') && (
                <SidebarMenuItem>
                <SidebarLink
                    href="/modules/back-office"
                    className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors"
                  >
                    <Building2 className="size-4" />
                  Profile Update
                  </SidebarLink>
                </SidebarMenuItem>
              )}

            {/* MLA e-Office Modules - Dynamically loaded based on permissions */}
            <ModuleNavigation user={user} modules={modules} />
          </SidebarMenu>
        </div>
      </SidebarContent>
      <SidebarFooter>{user && <SidebarUserNav user={user} />}</SidebarFooter>
    </Sidebar>
  );
}
