import { type NextRequest, NextResponse } from 'next/server';
import { getVisitorWithServices } from '@/lib/db/queries';
import { requireVisitorSession } from '@/lib/visitor/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireVisitorSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const visitor = await getVisitorWithServices(id);
    if (!visitor) {
      return NextResponse.json({ error: 'Visitor not found' }, { status: 404 });
    }

    return NextResponse.json({ visitor });
  } catch (error) {
    console.error('Error getting visitor:', error);
    return NextResponse.json({ error: 'Failed to get visitor' }, { status: 500 });
  }
}
