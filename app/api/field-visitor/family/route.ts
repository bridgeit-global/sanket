import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  bulkSaveFieldVisitorFamilyProfiles,
  getFieldVisitorFamily,
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

    const { familyMembers, primaryVoter } = await getFieldVisitorFamily(epicNumber);

    if (!primaryVoter) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
    }

    if (!primaryVoter.familyGrouping) {
      return NextResponse.json({
        success: true,
        familyMembers: [],
        message: 'No family grouping for this voter',
      });
    }

    return NextResponse.json({
      success: true,
      familyMembers,
      primaryVoter,
    });
  } catch (error) {
    console.error('Error getting family members:', error);
    return NextResponse.json(
      { error: 'Failed to get family members' },
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
    const { familyMembers } = body;

    if (!Array.isArray(familyMembers) || familyMembers.length === 0) {
      return NextResponse.json(
        { error: 'Family members array is required' },
        { status: 400 },
      );
    }

    const profiles = await bulkSaveFieldVisitorFamilyProfiles(
      familyMembers.map((member: Record<string, unknown>) => ({
        epicNumber: String(member.epicNumber),
        education: member.education as string | null | undefined,
        occupationType: member.occupationType as string | null | undefined,
        occupationDetail: member.occupationDetail as string | null | undefined,
        region: member.region as string | null | undefined,
        isOurSupporter: member.isOurSupporter as boolean | null | undefined,
        influencerType: member.influencerType as string | null | undefined,
        vehicleType: member.vehicleType as string | null | undefined,
        profiledBy: session.user.id,
      })),
    );

    return NextResponse.json({
      success: true,
      updatedCount: profiles.length,
      profiles,
    });
  } catch (error) {
    console.error('Error updating family profiles:', error);
    return NextResponse.json(
      { error: 'Failed to update family profiles' },
      { status: 500 },
    );
  }
}
