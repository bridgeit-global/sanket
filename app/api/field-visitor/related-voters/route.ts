import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db/queries';
import { VoterMaster, voterProfile } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

// GET: Get related voters from the same family who haven't been profiled
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const familyGrouping = searchParams.get('familyGrouping');
    const epicNumber = searchParams.get('epicNumber');

    if (!familyGrouping || !epicNumber) {
      return NextResponse.json(
        { error: 'Family grouping and EPIC number are required' },
        { status: 400 }
      );
    }

    // Get related voters from the same family who haven't been profiled
    const voters = await db
      .select({
        epicNumber: VoterMaster.epicNumber,
        fullName: VoterMaster.fullName,
        relationType: VoterMaster.relationType,
        relationName: VoterMaster.relationName,
        familyGrouping: VoterMaster.familyGrouping,
        houseNumber: VoterMaster.houseNumber,
        religion: VoterMaster.religion,
        caste: VoterMaster.caste,
        age: VoterMaster.age,
        gender: VoterMaster.gender,
        address: VoterMaster.address,
        srNo: VoterMaster.srNo,
        isProfiled: voterProfile.isProfiled,
        education: voterProfile.education,
        occupationType: voterProfile.occupationType,
        occupationDetail: voterProfile.occupationDetail,
        region: voterProfile.region,
        profileReligion: voterProfile.religion,
        profileCaste: voterProfile.caste,
        isOurSupporter: voterProfile.isOurSupporter,
        feedback: voterProfile.feedback,
        influencerType: voterProfile.influencerType,
        vehicleType: voterProfile.vehicleType,
        profiledAt: voterProfile.profiledAt,
      })
      .from(VoterMaster)
      .leftJoin(voterProfile, eq(VoterMaster.epicNumber, voterProfile.epicNumber))
      .where(
        and(
          eq(VoterMaster.familyGrouping, familyGrouping),
          // Either not in profile table or isProfiled is false/null
          isNull(voterProfile.isProfiled)
        )
      )
      .limit(10);

    // Filter out the current voter
    const relatedVoters = voters.filter(v => v.epicNumber !== epicNumber);

    return NextResponse.json({
      success: true,
      voters: relatedVoters,
    });
  } catch (error) {
    console.error('Error getting related voters:', error);
    return NextResponse.json(
      { error: 'Failed to get related voters' },
      { status: 500 }
    );
  }
}
