import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { LetterTemplateEditorPage } from '@/components/letter-template-editor-page';
import { isUserAdmin } from '@/lib/db/cadre-queries';
import { hasModuleAccess } from '@/lib/db/queries';

export default async function LetterTemplateEditorRoutePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const hasAccess = await hasModuleAccess(session.user.id, 'letter-generation');
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  const admin = await isUserAdmin(session.user.id);
  if (!admin) {
    redirect('/unauthorized');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl p-4 sm:py-8">
        <Suspense fallback={null}>
          <LetterTemplateEditorPage />
        </Suspense>
      </div>
    </div>
  );
}
