import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db/queries';
import { 
  VoterMaster, 
  ElectionMapping, 
  voterProfile, 
  userPartAssignment,
  BoothMaster 
} from '@/lib/db/schema';
import { eq, and, asc, desc, sql } from 'drizzle-orm';

// GET: Get voters for assigned part numbers with profile status
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const boothNo = searchParams.get('boothNo');
    const electionId = searchParams.get('electionId');
    const profiledFilter = searchParams.get('profiled'); // 'true', 'false', or null for all

    if (!boothNo) {
      return NextResponse.json(
        { error: 'Booth number is required' },
        { status: 400 }
      );
    }

    // Get latest election if not provided
    let targetElectionId = electionId;
    if (!targetElectionId) {
      const [latestElection] = await db
        .select({ electionId: BoothMaster.electionId })
        .from(BoothMaster)
        .where(eq(BoothMaster.boothNo, boothNo))
        .orderBy(desc(BoothMaster.createdAt))
        .limit(1);
      
      if (!latestElection) {
        return NextResponse.json({ 
          success: true, 
          voters: [],
          message: 'No election found for this booth'
        });
      }
      targetElectionId = latestElection.electionId;
    }

    // Verify user has access to this booth
    const [assignment] = await db
      .select()
      .from(userPartAssignment)
      .where(
        and(
          eq(userPartAssignment.userId, session.user.id),
          eq(userPartAssignment.electionId, targetElectionId),
          eq(userPartAssignment.boothNo, boothNo)
        )
      )
      .limit(1);

    if (!assignment) {
      return NextResponse.json(
        { error: 'You do not have access to this booth' },
        { status: 403 }
      );
    }

    // Build query for voters
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
        srNo: ElectionMapping.srNo,
        // Profile fields
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
      .innerJoin(
        ElectionMapping,
        and(
          eq(VoterMaster.epicNumber, ElectionMapping.epicNumber),
          eq(ElectionMapping.electionId, targetElectionId),
          eq(ElectionMapping.boothNo, boothNo)
        )
      )
      .leftJoin(
        voterProfile,
        eq(VoterMaster.epicNumber, voterProfile.epicNumber)
      )
      .where(
        profiledFilter === 'true' 
          ? eq(voterProfile.isProfiled, true)
          : profiledFilter === 'false'
            ? sql`(${voterProfile.isProfiled} IS NULL OR ${voterProfile.isProfiled} = false)`
            : undefined
      )
      .orderBy(asc(ElectionMapping.srNo), asc(VoterMaster.fullName));

    // Get stats
    const [stats] = await db
      .select({
        total: sql<number>`count(*)`,
        profiled: sql<number>`count(case when ${voterProfile.isProfiled} = true then 1 end)`,
      })
      .from(VoterMaster)
      .innerJoin(
        ElectionMapping,
        and(
          eq(VoterMaster.epicNumber, ElectionMapping.epicNumber),
          eq(ElectionMapping.electionId, targetElectionId),
          eq(ElectionMapping.boothNo, boothNo)
        )
      )
      .leftJoin(
        voterProfile,
        eq(VoterMaster.epicNumber, voterProfile.epicNumber)
      );

    return NextResponse.json({
      success: true,
      voters,
      stats: {
        total: Number(stats?.total || 0),
        profiled: Number(stats?.profiled || 0),
        pending: Number(stats?.total || 0) - Number(stats?.profiled || 0),
      },
      electionId: targetElectionId,
      boothNo,
    });
  } catch (error) {
    console.error('Error getting voters:', error);
    return NextResponse.json(
      { error: 'Failed to get voters' },
      { status: 500 }
    );
  }
}
