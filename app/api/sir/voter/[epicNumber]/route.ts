import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  getVoterByEpicNumber,
  getVoterMobileNumbersByEpicNumbers,
  getSirPartAndSerial,
  logSirActivity,
  updateVoter,
} from '@/lib/db/queries';
import { isValidIndianMobile, normalizeIndianMobileDigits } from '@/lib/indian-mobile';
import {
  SIR_STATE,
  SIR_DISTRICT,
  SIR_ASSEMBLY_CONSTITUENCY,
  SIR_SOURCE_MODULE,
} from '@/lib/sir/constants';

async function assembleProfile(epicNumber: string) {
  const voters = await getVoterByEpicNumber(epicNumber);
  if (voters.length === 0) return null;
  const voter = voters[0];

  const [mobileMap, partAndSerial] = await Promise.all([
    getVoterMobileNumbersByEpicNumbers([voter.epicNumber]),
    getSirPartAndSerial(voter.epicNumber),
  ]);

  const mobileNumbers = (mobileMap.get(voter.epicNumber) || [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    epicNumber: voter.epicNumber,
    fullName: voter.fullName,
    age: voter.age,
    dob: voter.dob,
    gender: voter.gender,
    relationType: voter.relationType,
    relationName: voter.relationName,
    state: SIR_STATE,
    district: SIR_DISTRICT,
    assemblyConstituency: SIR_ASSEMBLY_CONSTITUENCY,
    partNo: partAndSerial.partNo,
    srNo: partAndSerial.srNo,
    mobileNumbers,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ epicNumber: string }> },
) {
  try {
    const session = await auth();
    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || !modules.includes('sir')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { epicNumber } = await params;
    const decodedEpicNumber = decodeURIComponent(epicNumber);

    const profile = await assembleProfile(decodedEpicNumber);
    if (!profile) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
    }

    // Record that this user opened (searched) this voter's SIR profile.
    await logSirActivity('search', decodedEpicNumber, session.user.id);

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('Error getting SIR voter profile:', error);
    return NextResponse.json(
      { error: 'Failed to get voter profile' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ epicNumber: string }> },
) {
  try {
    const session = await auth();
    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || !modules.includes('sir')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { epicNumber } = await params;
    const decodedEpicNumber = decodeURIComponent(epicNumber);

    const body = await request.json();
    const { mobileNumbers, dob } = body as {
      mobileNumbers?: unknown;
      dob?: unknown;
    };

    const voters = await getVoterByEpicNumber(decodedEpicNumber);
    if (voters.length === 0) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
    }
    const voter = voters[0];

    const existingMobileMap = await getVoterMobileNumbersByEpicNumbers([
      decodedEpicNumber,
    ]);
    const existingMobiles = existingMobileMap.get(decodedEpicNumber) || [];
    const hasExistingPhone = existingMobiles.length > 0;
    const hasExistingDob = Boolean(voter.dob);
    const existingMobileDigits = new Set(
      existingMobiles.map((m) => normalizeIndianMobileDigits(m.mobileNumber)),
    );

    // Validate and normalize phone numbers.
    let normalizedMobileNumbers: string[] | undefined;
    if (mobileNumbers !== undefined) {
      if (!Array.isArray(mobileNumbers) || mobileNumbers.some((n) => typeof n !== 'string')) {
        return NextResponse.json(
          { error: 'Mobile numbers must be an array of strings' },
          { status: 400 },
        );
      }
      const provided = (mobileNumbers as string[])
        .map((n) => n.trim())
        .filter((n) => n.length > 0);

      // Only newly added numbers must satisfy Indian-mobile rules. Numbers
      // already stored for this voter are accepted as-is (they are immutable
      // in the SIR UI and may predate the current validation).
      for (const n of provided) {
        const digits = normalizeIndianMobileDigits(n);
        if (existingMobileDigits.has(digits)) continue;
        if (!isValidIndianMobile(n)) {
          return NextResponse.json(
            { error: 'Enter valid 10-digit Indian mobile numbers' },
            { status: 400 },
          );
        }
      }

      const seen = new Set<string>();
      normalizedMobileNumbers = [];
      for (const n of provided) {
        const digits = normalizeIndianMobileDigits(n);
        if (seen.has(digits)) continue;
        seen.add(digits);
        normalizedMobileNumbers.push(digits);
      }
      normalizedMobileNumbers = normalizedMobileNumbers.slice(0, 5);
    }

    const normalizedDob =
      typeof dob === 'string' && dob.trim() ? dob.trim() : undefined;

    // Enforce mandatory-if-missing rules.
    if (!hasExistingPhone && !(normalizedMobileNumbers && normalizedMobileNumbers.length > 0)) {
      return NextResponse.json(
        { error: 'Primary mobile number is required' },
        { status: 400 },
      );
    }
    if (!hasExistingDob && !normalizedDob) {
      return NextResponse.json(
        { error: 'Date of birth is required' },
        { status: 400 },
      );
    }

    await updateVoter(
      decodedEpicNumber,
      {
        fullName: voter.fullName,
        ...(normalizedMobileNumbers !== undefined
          ? { mobileNumbers: normalizedMobileNumbers }
          : {}),
        ...(normalizedDob !== undefined ? { dob: normalizedDob } : {}),
      },
      session.user.id,
      SIR_SOURCE_MODULE,
    );

    const profile = await assembleProfile(decodedEpicNumber);
    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('Error updating SIR voter profile:', error);
    return NextResponse.json(
      { error: 'Failed to update voter profile' },
      { status: 500 },
    );
  }
}
