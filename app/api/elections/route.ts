import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getElectionMasters } from '@/lib/db/queries';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const elections = await getElectionMasters();

    return NextResponse.json({
      success: true,
      elections,
    });
  } catch (error) {
    console.error('Error getting elections:', error);
    return NextResponse.json(
      { error: 'Failed to get elections' },
      { status: 500 }
    );
  }
}
