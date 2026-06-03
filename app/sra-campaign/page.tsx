import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/app/(auth)/auth';
import { SraCampaignModule } from '@/components/sra-campaign-module';

export default async function PublicSraCampaignPage() {
  const session = await auth();

  if (session?.user) {
    redirect('/modules/sra-campaign');
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            ← Home
          </Link>
        </div>
      </header>
      <div className="container mx-auto max-w-5xl p-4 sm:py-8">
        <SraCampaignModule isPublic canViewRecords={!!session?.user} />
      </div>
    </div>
  );
}
