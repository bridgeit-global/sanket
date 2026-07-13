import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { LetterGeneration } from '@/components/letter-generation';
import { isUserAdmin } from '@/lib/db/cadre-queries';
import {
  hasModuleAccess,
  getBeneficiaryServiceById,
  getVoterByEpicNumber,
} from '@/lib/db/queries';

export default async function LetterGenerationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const hasAccess = await hasModuleAccess(session.user.id, 'letter-generation');
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  // Letter generation is only reachable from a recorded beneficiary service.
  const params = await searchParams;
  const beneficiaryServiceId = params.beneficiaryServiceId;
  if (!beneficiaryServiceId) {
    redirect('/modules/operator');
  }

  const service = await getBeneficiaryServiceById(beneficiaryServiceId);
  if (!service) {
    redirect('/modules/operator');
  }

  let prefillName = '';
  let prefillAddress = '';
  if (service.voterId) {
    try {
      const voters = await getVoterByEpicNumber(service.voterId);
      const voter = voters[0];
      if (voter) {
        prefillName = voter.fullName ?? '';
        prefillAddress = voter.address ?? '';
      }
    } catch {
      // best-effort prefill; ignore lookup failures
    }
  }

  const isAdmin = await isUserAdmin(session.user.id);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl p-4 sm:py-8">
        <LetterGeneration
          isAdmin={isAdmin}
          beneficiaryServiceId={beneficiaryServiceId}
          prefillName={prefillName}
          prefillAddress={prefillAddress}
        />
      </div>
    </div>
  );
}
