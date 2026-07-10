import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { LetterGeneration } from '@/components/letter-generation';
import { isUserAdmin } from '@/lib/db/cadre-queries';
import { hasModuleAccess } from '@/lib/db/queries';

export default async function LetterGenerationPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const hasAccess = await hasModuleAccess(session.user.id, 'letter-generation');
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  const isAdmin = await isUserAdmin(session.user.id);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl p-4 sm:py-8">
        <LetterGeneration isAdmin={isAdmin} />
      </div>
    </div>
  );
}
