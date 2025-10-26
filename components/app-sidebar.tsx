'use client';

import type { User } from 'next-auth';
import { useRouter } from 'next/navigation';

import { PlusIcon } from '@/components/icons';
import { SidebarHistory } from '@/components/sidebar-history';
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
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Calendar, BarChart3, Users, Settings } from 'lucide-react';

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();

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
        <SidebarHistory user={user} />

        {/* Navigation Menu */}
        <div className="px-2 py-4">
          <SidebarMenu>
            {user && ['admin', 'back-office', 'operator'].includes(user.role) && (
              <SidebarMenuItem>
                <Link
                  href="/calendar"
                  onClick={() => setOpenMobile(false)}
                  className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors"
                >
                  <Calendar className="h-4 w-4" />
                  Calendar
                </Link>
              </SidebarMenuItem>
            )}

            {user && user.role === 'admin' && (
              <>
                <SidebarMenuItem>
                  <Link
                    href="/admin"
                    onClick={() => setOpenMobile(false)}
                    className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Analytics
                  </Link>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <Link
                    href="/back-office"
                    onClick={() => setOpenMobile(false)}
                    className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors"
                  >
                    <Users className="h-4 w-4" />
                    Back Office
                  </Link>
                </SidebarMenuItem>
              </>
            )}
          </SidebarMenu>
        </div>
      </SidebarContent>
      <SidebarFooter>{user && <SidebarUserNav user={user} />}</SidebarFooter>
    </Sidebar>
  );
}
