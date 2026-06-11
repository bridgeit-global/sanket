import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getFieldVisitorRelatedVoters } from '@/lib/db/queries';

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

    const relatedVoters = await getFieldVisitorRelatedVoters({
      familyGrouping,
      epicNumber,
    });

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
