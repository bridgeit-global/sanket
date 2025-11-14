import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { Calendar } from '@/components/calendar';
import { hasModuleAccess } from '@/lib/db/queries';

export default async function CalendarPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const hasAccess = await hasModuleAccess(session.user.id, 'calendar');
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <Calendar userRole={session.user.role} />
    </div>
  );
}

