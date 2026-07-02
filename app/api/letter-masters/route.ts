import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getLetterMasters } from '@/lib/db/queries';

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || !modules.includes('letter-generation')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const letterMasters = await getLetterMasters();
    return NextResponse.json({ letterMasters });
  } catch (error) {
    console.error('Error fetching letter masters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch letter masters' },
      { status: 500 },
    );
  }
}
