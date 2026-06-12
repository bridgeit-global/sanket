import { cookies } from 'next/headers';
import { unstable_cache } from 'next/cache';

import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { auth } from '../(auth)/auth';
import { DataStreamProvider } from '@/components/data-stream-provider';
import { NavigationLoadingProvider } from '@/components/navigation-loading-provider';
import { getUserAccessibleModules } from '@/lib/module-access';
import { ErrorBoundaryWrapper } from '@/components/error-boundary-wrapper';
import { ModulesProvider } from '@/components/modules-context';

export const experimental_ppr = true;

export default async function ModulesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  
  const modules = session?.user?.id
    ? await unstable_cache(
        async () => getUserAccessibleModules(session.user.id),
        ['user-accessible-modules', session.user.id],
        { revalidate: 300 },
      )()
    : [];
  const isCollapsed = cookieStore.get('sidebar:state')?.value !== 'true';

  return (
    <>
      <DataStreamProvider>
        <NavigationLoadingProvider>
          <SidebarProvider defaultOpen={!isCollapsed}>
            <AppSidebar user={session?.user} modules={modules} />
            <SidebarInset>
              <ErrorBoundaryWrapper>
                <ModulesProvider
                  session={session ? { user: session.user } : null}
                  accessibleModules={modules}
                >
                  {children}
                </ModulesProvider>
              </ErrorBoundaryWrapper>
            </SidebarInset>
          </SidebarProvider>
        </NavigationLoadingProvider>
      </DataStreamProvider>
    </>
  );
}

