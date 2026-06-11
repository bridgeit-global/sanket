import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  getFieldVisitorProfile,
  saveFieldVisitorProfile,
} from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const epicNumber = searchParams.get('epicNumber');

    if (!epicNumber) {
      return NextResponse.json(
        { error: 'EPIC number is required' },
        { status: 400 },
      );
    }

    const voter = await getFieldVisitorProfile(epicNumber);

    if (!voter) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      voter,
    });
  } catch (error) {
    console.error('Error getting voter profile:', error);
    return NextResponse.json(
      { error: 'Failed to get voter profile' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      epicNumber,
      education,
      occupationType,
      occupationDetail,
      region,
      religion,
      caste,
      isOurSupporter,
      feedback,
      influencerType,
      vehicleType,
    } = body;

    if (!epicNumber) {
      return NextResponse.json(
        { error: 'EPIC number is required' },
        { status: 400 },
      );
    }

    const savedProfile = await saveFieldVisitorProfile({
      epicNumber,
      education,
      occupationType,
      occupationDetail,
      region,
      religion,
      caste,
      isOurSupporter,
      feedback,
      influencerType,
      vehicleType,
      profiledBy: session.user.id,
    });

    return NextResponse.json({
      success: true,
      profile: savedProfile,
    });
  } catch (error) {
    console.error('Error saving voter profile:', error);
    return NextResponse.json(
      { error: 'Failed to save voter profile' },
      { status: 500 },
    );
  }
}
