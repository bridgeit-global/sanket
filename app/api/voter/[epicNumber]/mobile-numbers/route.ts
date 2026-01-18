import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getVoterMobileNumbersByEpicNumbers } from '@/lib/db/queries';

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

    const mobileNumbersMap = await getVoterMobileNumbersByEpicNumbers([decodedEpicNumber]);
    const voterMobileNumbers = mobileNumbersMap.get(decodedEpicNumber) || [];

    return NextResponse.json({
      success: true,
      voterMobileNumbers,
    });
  } catch (error) {
    console.error('Error getting voter mobile numbers:', error);
    return NextResponse.json(
      { error: 'Failed to get voter mobile numbers' },
      { status: 500 }
    );
  }
}
