import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { RegisterModule } from '@/components/register-module';
import { hasModuleAccess } from '@/lib/db/queries';

export default async function InwardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const hasAccess = await hasModuleAccess(session.user.id, 'inward');
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  return (
    <div className="container mx-auto p-4 sm:py-8 max-w-7xl">
      <RegisterModule type="inward" />
    </div>
  );
}

