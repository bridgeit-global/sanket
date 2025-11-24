import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { ProjectsModule } from '@/components/projects-module';
import { hasModuleAccess } from '@/lib/db/queries';

export default async function ProjectsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const hasAccess = await hasModuleAccess(session.user.id, 'projects');
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  return (
    <div className="container mx-auto p-4 sm:py-8 max-w-7xl">
      <ProjectsModule />
    </div>
  );
}

