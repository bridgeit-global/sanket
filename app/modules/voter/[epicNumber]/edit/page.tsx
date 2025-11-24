import { redirect } from 'next/navigation';
import { auth } from '@/app/(auth)/auth';
import { VoterProfileEdit } from '@/components/voter-profile-edit';

export default async function VoterProfileEditPage({
  params,
}: {
  params: Promise<{ epicNumber: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  const { epicNumber } = await params;
  const decodedEpicNumber = decodeURIComponent(epicNumber);

  return <VoterProfileEdit epicNumber={decodedEpicNumber} />;
}

