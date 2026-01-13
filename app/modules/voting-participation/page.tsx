import { redirect } from 'next/navigation';
import { auth } from '@/app/(auth)/auth';
import { VotingParticipation } from '@/components/voting-participation';

export default async function VotingParticipationPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }
  const modules = (session?.user?.modules as string[]) || [];
  console.log(modules)
  // if (!modules.includes('voting-participation') && !modules.includes('operator') && !modules.includes('admin')) {
  //   redirect('/unauthorized');
  // }

  return <VotingParticipation />;
}
