import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { SirWorkflow } from '@/components/sir-workflow';
import { hasModuleAccess } from '@/lib/db/queries';

export default async function SirPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const hasAccess = await hasModuleAccess(session.user.id, 'sir');
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:py-8 max-w-4xl">
        <SirWorkflow />
      </div>
    </div>
  );
}
