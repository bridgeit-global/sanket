import { auth } from '../(auth)/auth';
import { redirect } from 'next/navigation';
import { getUserAccessibleModules } from '@/lib/module-access';

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Get user's accessible modules and redirect to default landing module or first available module
  const modules = await getUserAccessibleModules(session.user.id);

  // Check if user has a default landing module set and it's accessible
  if (session.user.defaultLandingModule) {
    const defaultModule = modules.find(
      (m) => m.key === session.user.defaultLandingModule,
    );
    if (defaultModule) {
      redirect(defaultModule.route);
    }
  }

  // Fall back to priority order for redirects
  const priorityModules = [
    'chat',
    'dashboard',
    'operator',
    'back-office',
    'daily-programme',
  ];

  for (const moduleKey of priorityModules) {
    const accessibleModule = modules.find((m) => m.key === moduleKey);
    if (accessibleModule) {
      redirect(accessibleModule.route);
    }
  }

  // If no modules found, redirect to profile
  redirect('/modules/profile');
}
