import { redirect } from 'next/navigation';
import { auth } from '@/app/(auth)/auth';
import { SraCampaignModule } from '@/components/sra-campaign-module';

export default async function SraCampaignStaffPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login?callbackUrl=/modules/sra-campaign');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl p-4 sm:py-8">
        <SraCampaignModule />
      </div>
    </div>
  );
}
