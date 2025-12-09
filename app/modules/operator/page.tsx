import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { BeneficiaryManagement } from '@/components/operator-workflow';
import { hasModuleAccess } from '@/lib/db/queries';

export default async function OperatorPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const hasAccess = await hasModuleAccess(session.user.id, 'operator');
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:py-8 max-w-7xl">
        <BeneficiaryManagement />
      </div>
    </div>
  );
}

