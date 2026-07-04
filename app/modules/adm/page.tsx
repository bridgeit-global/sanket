import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { AdmModule } from '@/components/adm-module';
import { hasModuleAccess } from '@/lib/db/queries';

export default async function AdmPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const hasAccess = await hasModuleAccess(session.user.id, 'adm');
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  return (
    <div className="container mx-auto p-4 sm:py-8 max-w-7xl">
      <AdmModule />
    </div>
  );
}
