import { auth } from '../(auth)/auth';
import { redirect } from 'next/navigation';
import { getUserAccessibleModules } from '@/lib/module-access';

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Get user's accessible modules and redirect to first available module
  const modules = await getUserAccessibleModules(session.user.id);
  
  // Priority order for redirects
  const priorityModules = [
    'chat',
    'mla-dashboard',
    'operator',
    'back-office',
    'calendar',
    'daily-programme',
  ];

  for (const moduleKey of priorityModules) {
    const module = modules.find((m) => m.key === moduleKey);
    if (module) {
      redirect(module.route);
    }
  }

  // If no modules found, redirect to profile
  redirect('/modules/profile');
}
