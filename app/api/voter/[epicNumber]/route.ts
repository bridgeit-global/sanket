import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { 
  getVoterByEpicNumber, 
  getRelatedVoters, 
  updateVoter,
  getVoterBeneficiaryServices,
  getVoterDailyProgrammeEvents,
  getRelatedVotersServicesAndEvents,
} from '@/lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ epicNumber: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { epicNumber } = await params;
    const decodedEpicNumber = decodeURIComponent(epicNumber);

    // Get voter details
    const voters = await getVoterByEpicNumber(decodedEpicNumber);

    if (voters.length === 0) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
    }

    const voter = voters[0];

    // Get related voters
    const relatedVoters = await getRelatedVoters(voter);

    // Get beneficiary services for the voter
    const beneficiaryServices = await getVoterBeneficiaryServices(voter.epicNumber);

    // Get daily programme events for the voter (by contact numbers)
    const contactNumbers: string[] = [];
    if (voter.mobileNoPrimary) contactNumbers.push(voter.mobileNoPrimary);
    if (voter.mobileNoSecondary) contactNumbers.push(voter.mobileNoSecondary);
    const dailyProgrammeEvents = await getVoterDailyProgrammeEvents(contactNumbers);

    // Get services and events for related voters
    const relatedVotersData = await getRelatedVotersServicesAndEvents(relatedVoters);

    return NextResponse.json({
      success: true,
      voter,
      relatedVoters,
      beneficiaryServices,
      dailyProgrammeEvents,
      relatedVotersData,
    });
  } catch (error) {
    console.error('Error getting voter profile:', error);
    return NextResponse.json(
      { error: 'Failed to get voter profile' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ epicNumber: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to update voters
    const modules = (session?.user?.modules as string[]) || [];
    if (!modules.includes('operator')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { epicNumber } = await params;
    const decodedEpicNumber = decodeURIComponent(epicNumber);

    const body = await request.json();
    const {
      fullName,
      age,
      gender,
      familyGrouping,
      religion,
      mobileNoPrimary,
      mobileNoSecondary,
      houseNumber,
      address,
      pincode,
      relationType,
      relationName,
      isVoted2024
    } = body;

    // Validate required fields
    if (!fullName || typeof fullName !== 'string') {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      );
    }

    // Validate phone number format if provided
    const phoneRegex = /^[\d\s\-\(\)]{7,15}$/;
    if (mobileNoPrimary && !phoneRegex.test(mobileNoPrimary.trim())) {
      return NextResponse.json(
        { error: 'Invalid primary mobile number format' },
        { status: 400 }
      );
    }

    if (mobileNoSecondary && !phoneRegex.test(mobileNoSecondary.trim())) {
      return NextResponse.json(
        { error: 'Invalid secondary mobile number format' },
        { status: 400 }
      );
    }

    // Update voter with tracking parameters
    const updatedVoter = await updateVoter(
      decodedEpicNumber,
      {
        fullName: fullName.trim(),
        age: age !== undefined ? Number(age) : undefined,
        gender: gender?.trim() || undefined,
        familyGrouping: familyGrouping?.trim() || undefined,
        religion: religion?.trim() || undefined,
        mobileNoPrimary: mobileNoPrimary?.trim() || undefined,
        mobileNoSecondary: mobileNoSecondary?.trim() || undefined,
        houseNumber: houseNumber?.trim() || undefined,
        address: address?.trim() || undefined,
        pincode: pincode?.trim() || undefined,
        relationType: relationType?.trim() || undefined,
        relationName: relationName?.trim() || undefined,
        isVoted2024: isVoted2024 !== undefined ? Boolean(isVoted2024) : undefined,
      },
      session.user.id,
      'profile_update'
    );

    if (!updatedVoter) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      voter: updatedVoter,
    });
  } catch (error) {
    console.error('Error updating voter profile:', error);
    return NextResponse.json(
      { error: 'Failed to update voter profile' },
      { status: 500 }
    );
  }
}

