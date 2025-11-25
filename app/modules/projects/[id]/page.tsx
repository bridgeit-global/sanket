import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { ProjectDetail } from '@/components/project-detail';
import { hasModuleAccess } from '@/lib/db/queries';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const hasAccess = await hasModuleAccess(session.user.id, 'projects');
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  const { id } = await params;

  return (
    <div className="container mx-auto p-4 sm:py-8 max-w-7xl">
      <ProjectDetail projectId={id} />
    </div>
  );
}

