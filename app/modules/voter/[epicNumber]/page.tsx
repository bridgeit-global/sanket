import { redirect } from 'next/navigation';
import { auth } from '@/app/(auth)/auth';
import { VoterProfile } from '@/components/voter-profile';

export default async function VoterProfilePage({
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

  return <VoterProfile epicNumber={decodedEpicNumber} />;
}

