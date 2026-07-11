import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { DocumentTypeMasterPage } from '@/components/document-type-master-page';
import { hasModuleAccess } from '@/lib/db/queries';

export default async function DocumentTypeMasterRoutePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const [hasLetter, hasOutward] = await Promise.all([
    hasModuleAccess(session.user.id, 'letter-generation'),
    hasModuleAccess(session.user.id, 'outward'),
  ]);
  if (!hasLetter && !hasOutward) {
    redirect('/unauthorized');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl p-4 sm:py-8">
        <Suspense fallback={null}>
          <DocumentTypeMasterPage />
        </Suspense>
      </div>
    </div>
  );
}
