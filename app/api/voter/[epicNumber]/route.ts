import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getVoterByEpicNumber, getRelatedVoters, updateVoter } from '@/lib/db/queries';

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

    return NextResponse.json({
      success: true,
      voter,
      relatedVoters,
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
    const { mobileNoPrimary, mobileNoSecondary, houseNumber, relationType, relationName, isVoted2024 } = body;

    // Validate required fields
    if (!mobileNoPrimary || typeof mobileNoPrimary !== 'string') {
      return NextResponse.json(
        { error: 'Primary mobile number is required' },
        { status: 400 }
      );
    }

    // Validate phone number format
    const phoneRegex = /^[\d\s\-\(\)]{7,15}$/;
    if (!phoneRegex.test(mobileNoPrimary.trim())) {
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

    // Update voter
    const updatedVoter = await updateVoter(decodedEpicNumber, {
      mobileNoPrimary: mobileNoPrimary.trim(),
      mobileNoSecondary: mobileNoSecondary?.trim() || undefined,
      houseNumber: houseNumber?.trim() || undefined,
      relationType: relationType?.trim() || undefined,
      relationName: relationName?.trim() || undefined,
      isVoted2024: isVoted2024 !== undefined ? Boolean(isVoted2024) : undefined,
    });

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

