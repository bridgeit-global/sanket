import { type NextRequest, NextResponse } from 'next/server';
import {
  getBeneficiaryServiceAttachments,
  getLetters,
  getRelatedVoters,
  getRelatedVotersServicesAndEvents,
  getVoterBeneficiaryServices,
  getVoterByEpicNumber,
  getVoterDailyProgrammeEvents,
  getVoterMobileNumbersByEpicNumbers,
  getVoterVotingHistory,
  getVisitorWithServices,
} from '@/lib/db/queries';
import { getCadreMembersByEpicNumber } from '@/lib/db/cadre-queries';
import { requireVisitorSession } from '@/lib/visitor/auth';

type LetterSummary = {
  id: string;
  beneficiaryServiceId: string | null;
  letterType: string;
  referenceNo: string;
  title: string;
  printedAt: Date | null;
  createdAt: Date;
  pdfStoragePath: string | null;
};

type AttachmentSummary = {
  id: string;
  serviceId: string;
  fileName: string;
  fileSizeKb: number;
  fileUrl: string | null;
  createdAt: Date;
};

/**
 * Expand payload for a visitor card: visit context + (when EPIC present)
 * full voter roll, voting history, cadre hierarchy, services, family, letters, attachments.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireVisitorSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const visitor = await getVisitorWithServices(id);
    if (!visitor) {
      return NextResponse.json({ error: 'Visitor not found' }, { status: 404 });
    }

    const epic = visitor.voterId?.trim().toUpperCase() || null;
    if (!epic) {
      return NextResponse.json({
        success: true,
        hasVoter: false,
        visitor,
        voter: null,
        voterMobileNumbers: [],
        relatedVoters: [],
        beneficiaryServices: { individual: [], community: [] },
        dailyProgrammeEvents: [],
        relatedVotersData: [],
        cadreMembers: [],
        votingHistory: [],
        letters: [] as LetterSummary[],
        attachments: [] as AttachmentSummary[],
      });
    }

    const voters = await getVoterByEpicNumber(epic);
    if (voters.length === 0) {
      // EPIC on visitor but no roll row — still try cadre + voting + visit-linked docs
      const visitBeneficiaryIds = visitor.services
        .map((s) => s.beneficiaryServiceId)
        .filter((v): v is string => Boolean(v));
      const [cadreMembers, votingHistory, letters, attachments] =
        await Promise.all([
          getCadreMembersByEpicNumber(epic),
          getVoterVotingHistory(epic),
          loadLetterSummaries(visitBeneficiaryIds),
          loadAttachmentSummaries(visitBeneficiaryIds),
        ]);

      return NextResponse.json({
        success: true,
        hasVoter: true,
        voterNotFound: true,
        visitor,
        voter: null,
        voterMobileNumbers: [],
        relatedVoters: [],
        beneficiaryServices: { individual: [], community: [] },
        dailyProgrammeEvents: [],
        relatedVotersData: [],
        cadreMembers,
        votingHistory,
        letters,
        attachments,
      });
    }

    const voter = voters[0];
    const relatedVoters = await getRelatedVoters(voter);
    const allEpicNumbers = [
      voter.epicNumber,
      ...relatedVoters.map((rv) => rv.epicNumber),
    ];
    const [
      beneficiaryServices,
      mobileNumbersMap,
      relatedVotersData,
      cadreMembers,
      votingHistory,
    ] = await Promise.all([
      getVoterBeneficiaryServices(voter.epicNumber),
      getVoterMobileNumbersByEpicNumbers(allEpicNumbers),
      getRelatedVotersServicesAndEvents(relatedVoters),
      getCadreMembersByEpicNumber(epic),
      getVoterVotingHistory(epic),
    ]);

    const voterMobileNumbers = mobileNumbersMap.get(voter.epicNumber) || [];
    const contactNumbers = voterMobileNumbers.map((mn) => mn.mobileNumber);
    const dailyProgrammeEvents =
      await getVoterDailyProgrammeEvents(contactNumbers);

    const relatedVotersWithMobileNumbers = relatedVoters.map((rv) => ({
      ...rv,
      mobileNumbers: mobileNumbersMap.get(rv.epicNumber) || [],
    }));

    const serviceIds = new Set<string>();
    for (const s of visitor.services) {
      if (s.beneficiaryServiceId) serviceIds.add(s.beneficiaryServiceId);
    }
    for (const s of beneficiaryServices.individual) serviceIds.add(s.id);
    for (const s of beneficiaryServices.community) serviceIds.add(s.id);

    const serviceIdList = [...serviceIds];
    const [letters, attachments] = await Promise.all([
      loadLetterSummaries(serviceIdList),
      loadAttachmentSummaries(serviceIdList),
    ]);

    return NextResponse.json({
      success: true,
      hasVoter: true,
      voterNotFound: false,
      visitor,
      voter,
      voterMobileNumbers,
      relatedVoters: relatedVotersWithMobileNumbers,
      beneficiaryServices,
      dailyProgrammeEvents,
      relatedVotersData,
      cadreMembers,
      votingHistory,
      letters,
      attachments,
    });
  } catch (error) {
    console.error('Error getting visitor voter details:', error);
    return NextResponse.json(
      { error: 'Failed to get visitor voter details' },
      { status: 500 },
    );
  }
}

async function loadLetterSummaries(
  beneficiaryServiceIds: string[],
): Promise<LetterSummary[]> {
  if (beneficiaryServiceIds.length === 0) return [];
  const batches = await Promise.all(
    beneficiaryServiceIds.map((id) =>
      getLetters({ beneficiaryServiceId: id, limit: 20 }),
    ),
  );
  const seen = new Set<string>();
  const summaries: LetterSummary[] = [];
  for (const letters of batches) {
    for (const letter of letters) {
      if (seen.has(letter.id)) continue;
      seen.add(letter.id);
      summaries.push({
        id: letter.id,
        beneficiaryServiceId: letter.beneficiaryServiceId,
        letterType: letter.letterType,
        referenceNo: letter.referenceNo,
        title: letter.title,
        printedAt: letter.printedAt,
        createdAt: letter.createdAt,
        pdfStoragePath: letter.pdfStoragePath,
      });
    }
  }
  return summaries;
}

async function loadAttachmentSummaries(
  serviceIds: string[],
): Promise<AttachmentSummary[]> {
  if (serviceIds.length === 0) return [];
  const batches = await Promise.all(
    serviceIds.map((id) => getBeneficiaryServiceAttachments(id)),
  );
  return batches.flat().map((a) => ({
    id: a.id,
    serviceId: a.serviceId,
    fileName: a.fileName,
    fileSizeKb: a.fileSizeKb,
    fileUrl: a.fileUrl,
    createdAt: a.createdAt,
  }));
}
