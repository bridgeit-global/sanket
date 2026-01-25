import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db/queries';
import { voterProfile, VoterMaster } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET: Get voter profile by epic number
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
        { status: 400 }
      );
    }

    // Get voter with profile
    const [voter] = await db
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
        // Profile fields
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
        isProfiled: voterProfile.isProfiled,
        profiledAt: voterProfile.profiledAt,
      })
      .from(VoterMaster)
      .leftJoin(voterProfile, eq(VoterMaster.epicNumber, voterProfile.epicNumber))
      .where(eq(VoterMaster.epicNumber, epicNumber))
      .limit(1);

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
      { status: 500 }
    );
  }
}

// POST: Save/update voter profile
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
        { status: 400 }
      );
    }

    // Verify voter exists
    const [voter] = await db
      .select()
      .from(VoterMaster)
      .where(eq(VoterMaster.epicNumber, epicNumber))
      .limit(1);

    if (!voter) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
    }

    // Upsert profile
    const profileData = {
      epicNumber,
      education: education || null,
      occupationType: occupationType || null,
      occupationDetail: occupationDetail || null,
      region: region || null,
      religion: religion || null,
      caste: caste || null,
      isOurSupporter: isOurSupporter ?? null,
      feedback: feedback || null,
      influencerType: influencerType || null,
      vehicleType: vehicleType || null,
      isProfiled: true,
      profiledAt: new Date(),
      profiledBy: session.user.id,
      updatedAt: new Date(),
    };

    const [savedProfile] = await db
      .insert(voterProfile)
      .values({
        ...profileData,
        createdAt: new Date(),
      })
      .onConflictDoUpdate({
        target: voterProfile.epicNumber,
        set: profileData,
      })
      .returning();

    return NextResponse.json({
      success: true,
      profile: savedProfile,
    });
  } catch (error) {
    console.error('Error saving voter profile:', error);
    return NextResponse.json(
      { error: 'Failed to save voter profile' },
      { status: 500 }
    );
  }
}
