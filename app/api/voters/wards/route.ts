import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getDistinctWards } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const boothNo = searchParams.get('boothNo') ?? searchParams.get('partNo');

    const wardNumbers = await getDistinctWards(boothNo);

    return NextResponse.json({
      success: true,
      data: {
        wardNumbers,
        totalWards: wardNumbers.length,
      },
    });
  } catch (error) {
    console.error('Wards fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ward numbers' },
      { status: 500 },
    );
  }
}
