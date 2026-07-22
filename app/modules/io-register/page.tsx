import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { IoRegister } from '@/components/io-register';
import { isUserAdmin } from '@/lib/db/cadre-queries';
import { hasModuleAccess } from '@/lib/db/queries';

export default async function IoRegisterPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const hasAccess = await hasModuleAccess(session.user.id, 'io-register');
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  const isAdmin = await isUserAdmin(session.user.id);

  return (
    <div className="container mx-auto p-4 sm:py-8 max-w-7xl">
      <Suspense fallback={null}>
        <IoRegister isAdmin={isAdmin} />
      </Suspense>
    </div>
  );
}
