import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  getVisitorHistory,
  hasModuleAccess,
} from '@/lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contactNumber: string }> },
) {
  try {
    const session = await auth();
    const { contactNumber } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check module access
    const hasAccess = await hasModuleAccess(
      session.user.id,
      'visitor-management',
    );
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const history = await getVisitorHistory(decodeURIComponent(contactNumber));

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching visitor history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch visitor history' },
      { status: 500 },
    );
  }
}

