import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { LetterGeneration } from '@/components/letter-generation';
import { isUserAdmin } from '@/lib/db/cadre-queries';
import {
  findMatterByLetterId,
  getBeneficiaryServiceById,
  getGovFollowUpMatterById,
  getLetterById,
  getServiceCatalogByName,
  getVoterByEpicNumber,
  getVoterMobileNumbersByEpicNumbers,
  hasModuleAccess,
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

  const params = await searchParams;
  let beneficiaryServiceId = params.beneficiaryServiceId;
  let govFollowUpMatterId = params.govFollowUpMatterId;
  const letterId = params.letterId;

  if (!beneficiaryServiceId && !govFollowUpMatterId && letterId) {
    const letter = await getLetterById(letterId);
    if (letter?.beneficiaryServiceId) {
      redirect(
        `/modules/letter-generation?beneficiaryServiceId=${encodeURIComponent(letter.beneficiaryServiceId)}`,
      );
    }
    const matter = await findMatterByLetterId(letterId);
    if (matter) {
      redirect(
        `/modules/letter-generation?govFollowUpMatterId=${encodeURIComponent(matter.id)}`,
      );
    }
    redirect('/modules/operator');
  }

  if (!beneficiaryServiceId && !govFollowUpMatterId) {
    redirect('/modules/operator');
  }

  const isAdmin = await isUserAdmin(session.user.id);

  if (govFollowUpMatterId && !beneficiaryServiceId) {
    const matter = await getGovFollowUpMatterById(govFollowUpMatterId);
    if (!matter) {
      redirect('/modules/gov-follow-up');
    }

    const toName = [matter.officerName, matter.designation]
      .filter(Boolean)
      .join(', ');
    const toAddress = [
      matter.officeName,
      matter.deskName,
      matter.locationName,
      matter.departmentName,
    ]
      .filter(Boolean)
      .join('\n');

    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-7xl p-4 sm:py-8">
          <LetterGeneration
            isAdmin={isAdmin}
            govFollowUpMatterId={matter.id}
            govFollowUpPrefill={{
              followUpNo: matter.followUpNo,
              subject: matter.subject,
              toName,
              toAddress,
              departmentName: matter.departmentName,
              departmentCode: matter.departmentCode,
              locationName: matter.locationName,
              pendingWith: [matter.officerName, matter.officeName]
                .filter(Boolean)
                .join(' · '),
            }}
            initialLetterType="general"
          />
        </div>
      </div>
    );
  }

  const service = await getBeneficiaryServiceById(beneficiaryServiceId as string);
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl p-4 sm:py-8">
        <LetterGeneration
          isAdmin={isAdmin}
          beneficiaryServiceId={beneficiaryServiceId}
          govFollowUpMatterId={govFollowUpMatterId}
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
