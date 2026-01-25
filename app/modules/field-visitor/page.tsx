import { redirect } from 'next/navigation';
import { auth } from '@/app/(auth)/auth';
import { hasModuleAccess } from '@/lib/db/queries';
import { FieldVisitorWorkflow } from '@/components/field-visitor-workflow';

export default async function FieldVisitorPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const hasAccess = await hasModuleAccess(session.user.id, 'field-visitor');
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:py-8 max-w-7xl">
        <FieldVisitorWorkflow />
      </div>
    </div>
  );
}
