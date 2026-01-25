import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db/queries';
import { VoterMaster, voterProfile } from '@/lib/db/schema';
import { eq, and, ne, asc } from 'drizzle-orm';

// GET: Get family members for a voter
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

    // Get the voter to find their family grouping
    const [voter] = await db
      .select()
      .from(VoterMaster)
      .where(eq(VoterMaster.epicNumber, epicNumber))
      .limit(1);

    if (!voter) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
    }

    if (!voter.familyGrouping) {
      return NextResponse.json({
        success: true,
        familyMembers: [],
        message: 'No family grouping for this voter',
      });
    }

    // Get family members with their profile status
    const familyMembers = await db
      .select({
        epicNumber: VoterMaster.epicNumber,
        fullName: VoterMaster.fullName,
        relationType: VoterMaster.relationType,
        relationName: VoterMaster.relationName,
        familyGrouping: VoterMaster.familyGrouping,
        religion: VoterMaster.religion,
        caste: VoterMaster.caste,
        age: VoterMaster.age,
        gender: VoterMaster.gender,
        // Profile fields
        isProfiled: voterProfile.isProfiled,
        education: voterProfile.education,
        occupationType: voterProfile.occupationType,
        isOurSupporter: voterProfile.isOurSupporter,
        influencerType: voterProfile.influencerType,
        vehicleType: voterProfile.vehicleType,
      })
      .from(VoterMaster)
      .leftJoin(voterProfile, eq(VoterMaster.epicNumber, voterProfile.epicNumber))
      .where(
        and(
          eq(VoterMaster.familyGrouping, voter.familyGrouping),
          ne(VoterMaster.epicNumber, epicNumber)
        )
      )
      .orderBy(asc(VoterMaster.fullName));

    return NextResponse.json({
      success: true,
      familyMembers,
      primaryVoter: {
        epicNumber: voter.epicNumber,
        fullName: voter.fullName,
        religion: voter.religion,
        caste: voter.caste,
        familyGrouping: voter.familyGrouping,
      },
    });
  } catch (error) {
    console.error('Error getting family members:', error);
    return NextResponse.json(
      { error: 'Failed to get family members' },
      { status: 500 }
    );
  }
}

// POST: Bulk update family members with common fields
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
        { status: 400 }
      );
    }

    const results = [];

    for (const member of familyMembers) {
      const {
        epicNumber,
        education,
        occupationType,
        occupationDetail,
        region,
        isOurSupporter,
        influencerType,
        vehicleType,
      } = member;

      if (!epicNumber) continue;

      // Verify voter exists
      const [voter] = await db
        .select()
        .from(VoterMaster)
        .where(eq(VoterMaster.epicNumber, epicNumber))
        .limit(1);

      if (!voter) continue;

      // Upsert profile
      const profileData = {
        epicNumber,
        education: education || null,
        occupationType: occupationType || null,
        occupationDetail: occupationDetail || null,
        region: region || null,
        isOurSupporter: isOurSupporter ?? null,
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

      results.push(savedProfile);
    }

    return NextResponse.json({
      success: true,
      updatedCount: results.length,
      profiles: results,
    });
  } catch (error) {
    console.error('Error updating family profiles:', error);
    return NextResponse.json(
      { error: 'Failed to update family profiles' },
      { status: 500 }
    );
  }
}
