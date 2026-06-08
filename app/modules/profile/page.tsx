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
    <div className="container mx-auto p-4 sm:py-8 max-w-7xl">
      <ProfileHeader />
      <div className="space-y-6">
        <PushNotificationSettings />
        <UserProfile userId={session.user.id} />
      </div>
    </div>
  );
}

