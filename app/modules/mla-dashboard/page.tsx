import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { MlaDashboard } from '@/components/mla-dashboard';
import { hasModuleAccess } from '@/lib/db/queries';

export default async function MlaDashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const hasAccess = await hasModuleAccess(session.user.id, 'mla-dashboard');
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  return (
    <div className="container mx-auto p-4 sm:py-8 max-w-7xl">
      <MlaDashboard />
    </div>
  );
}

