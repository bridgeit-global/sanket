import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { AddVoterPage } from '@/components/add-voter-page';
import { hasModuleAccess } from '@/lib/db/queries';

export default async function BackOfficeAddVoterPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const hasAccess = await hasModuleAccess(session.user.id, 'back-office');
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl p-4 sm:py-8">
        <AddVoterPage />
      </div>
    </div>
  );
}
