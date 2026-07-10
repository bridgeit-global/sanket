import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';

import { AddressMasterPage } from '@/components/address-master-page';
import { hasModuleAccess } from '@/lib/db/queries';

export default async function AddressMasterRoutePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const hasAccess = await hasModuleAccess(session.user.id, 'letter-generation');
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl p-4 sm:py-8">
        <AddressMasterPage />
      </div>
    </div>
  );
}
