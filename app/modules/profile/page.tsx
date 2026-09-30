import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { UserProfile } from '@/components/user-profile';
import { ProfileHeader } from '@/components/profile-header';
import { PushNotificationSettings } from '@/components/push-notification-settings';

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl px-3 py-4 sm:px-4 md:py-6 lg:py-8">
      <ProfileHeader />
      <div className="space-y-6">
        <PushNotificationSettings />
        <UserProfile />
      </div>
    </div>
  );
}

