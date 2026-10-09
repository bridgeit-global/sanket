import { cookies } from 'next/headers';

import { AppSidebar } from '@/components/app-sidebar';
import { DataStreamProvider } from '@/components/data-stream-provider';
import { NavigationLoadingProvider } from '@/components/navigation-loading-provider';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { auth } from '@/app/(auth)/auth';
import { getUserAccessibleModules } from '@/lib/module-access';

export async function AppChrome({ children }: { children: React.ReactNode }) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const modules = session?.user?.id
    ? await getUserAccessibleModules(session.user.id)
    : [];
  const isCollapsed = cookieStore.get('sidebar:state')?.value !== 'true';

  return (
    <DataStreamProvider>
      <NavigationLoadingProvider>
        <SidebarProvider defaultOpen={!isCollapsed}>
          <AppSidebar user={session?.user} modules={modules} />
          <SidebarInset>{children}</SidebarInset>
        </SidebarProvider>
      </NavigationLoadingProvider>
    </DataStreamProvider>
  );
}
