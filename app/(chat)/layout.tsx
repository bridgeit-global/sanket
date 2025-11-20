import { cookies } from 'next/headers';

import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { auth } from '../(auth)/auth';
import Script from 'next/script';
import { DataStreamProvider } from '@/components/data-stream-provider';
import { NavigationLoadingProvider } from '@/components/navigation-loading-provider';
import { getUserAccessibleModules } from '@/lib/module-access';

export const experimental_ppr = true;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const accessibleModules = session?.user?.id
    ? await getUserAccessibleModules(session.user.id)
    : [];
  const isCollapsed = cookieStore.get('sidebar:state')?.value !== 'true';

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <DataStreamProvider>
        <NavigationLoadingProvider>
          <SidebarProvider defaultOpen={!isCollapsed}>
            <AppSidebar user={session?.user} modules={accessibleModules} />
            <SidebarInset>{children}</SidebarInset>
          </SidebarProvider>
        </NavigationLoadingProvider>
      </DataStreamProvider>
    </>
  );
}
