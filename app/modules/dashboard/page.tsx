import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { Dashboard } from '@/components/dashboard';
import { hasModuleAccess } from '@/lib/db/queries';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const hasAccess = await hasModuleAccess(session.user.id, 'dashboard');
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  return (
    <div className="container mx-auto p-4 sm:py-8 max-w-7xl">
      <Dashboard />
    </div>
  );
}

