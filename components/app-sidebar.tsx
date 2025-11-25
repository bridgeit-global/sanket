'use client';

import type { User } from 'next-auth';

import { SidebarUserNav } from '@/components/sidebar-user-nav';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import type { ModuleDefinition } from '@/lib/module-constants';
import { ModuleNavigation } from './module-navigation';

interface AppSidebarProps {
  user: User | undefined;
  modules?: ModuleDefinition[];
}

export function AppSidebar({ user, modules }: AppSidebarProps) {
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar className="group-data-[side=left]:border-r-0">
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row items-center">
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
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* Navigation Menu */}
        <div className="px-2 py-4">
          <SidebarMenu>
            {/* All Modules - Dynamically loaded and ordered based on permissions */}
            <ModuleNavigation user={user} modules={modules} />
          </SidebarMenu>
        </div>
      </SidebarContent>
      <SidebarFooter>{user && <SidebarUserNav user={user} />}</SidebarFooter>
    </Sidebar>
  );
}
