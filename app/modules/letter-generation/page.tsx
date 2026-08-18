import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { LetterGeneration } from '@/components/letter-generation';
import { isUserAdmin } from '@/lib/db/cadre-queries';
import {
  hasModuleAccess,
  getBeneficiaryServiceById,
  getServiceCatalogByName,
  getVoterByEpicNumber,
  getVoterMobileNumbersByEpicNumbers,
} from '@/lib/db/queries';
import { resolveLetterTypeFromServiceName } from '@/lib/letters/letter-type-options';
import { isSpecificWardLetterType } from '@/lib/letters/templates';

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
  let prefillContactNo = '';
  let prefillAddress = '';
  if (service.voterId) {
    try {
      const voters = await getVoterByEpicNumber(service.voterId);
      const voter = voters[0];
      if (voter) {
        prefillName = voter.fullName ?? '';
        prefillAddress = voter.address?.trim() || '';
      }
      const mobiles = await getVoterMobileNumbersByEpicNumbers([service.voterId]);
      const primary = mobiles.get(service.voterId)?.[0]?.mobileNumber?.trim();
      if (primary) {
        prefillContactNo = primary.replace(/\D/g, '').slice(-10);
      }
    } catch {
      // best-effort voter lookup; ignore failures
    }
  }

  // Letter type comes from the service catalog link — no manual dropdown.
  // If catalog still has legacy generic `ward`, promote to the specific
  // ward-* type inferred from the service name (e.g. Low Water Pressure).
  let initialLetterType: string | undefined;
  let catalogServiceId: string | undefined;
  try {
    const catalog = await getServiceCatalogByName(service.serviceName);
    if (catalog) {
      catalogServiceId = catalog.id;
      if (catalog.letterType) {
        initialLetterType = catalog.letterType;
      }
    }
  } catch {
    // best-effort catalog lookup
  }
  const inferredType = resolveLetterTypeFromServiceName(service.serviceName);
  if (
    isSpecificWardLetterType(inferredType) &&
    (!initialLetterType || initialLetterType === 'ward')
  ) {
    initialLetterType = inferredType;
  } else if (!initialLetterType && inferredType !== 'general') {
    initialLetterType = inferredType;
  }

  const isAdmin = await isUserAdmin(session.user.id);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl p-4 sm:py-8">
        <LetterGeneration
          isAdmin={isAdmin}
          beneficiaryServiceId={beneficiaryServiceId}
          prefillName={prefillName}
          prefill={{
            name: prefillName,
            contactNo: prefillContactNo,
            address: prefillAddress,
          }}
          initialLetterType={initialLetterType}
          catalogServiceId={catalogServiceId}
          service={{
            id: service.id,
            serviceName: service.serviceName,
            serviceType: service.serviceType,
            status: service.status,
            priority: service.priority,
            token: service.token,
            description: service.description,
            voterId: service.voterId,
            createdAt:
              service.createdAt instanceof Date
                ? service.createdAt.toISOString()
                : String(service.createdAt),
          }}
        />
      </div>
    </div>
  );
}
