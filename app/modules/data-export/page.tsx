import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { DataExport } from '@/components/data-export';
import { ModulePageHeader } from '@/components/module-page-header';
import { hasModuleAccess } from '@/lib/db/queries';

export default async function DataExportPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const hasAccess = await hasModuleAccess(session.user.id, 'data-export');

  if (!hasAccess) {
    redirect('/unauthorized');
  }

  return (
    <div className="container mx-auto p-4 sm:py-8 max-w-7xl">
      <DataExport />
    </div>
  );
}
