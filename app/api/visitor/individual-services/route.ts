import { type NextRequest, NextResponse } from 'next/server';
import { getActiveServiceCatalog } from '@/lib/db/queries';
import { requireVisitorSession } from '@/lib/visitor/auth';

export async function GET(_request: NextRequest) {
  try {
    const session = await requireVisitorSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const services = await getActiveServiceCatalog();
    const body = services.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      letterType: row.letterType,
      sortOrder: row.sortOrder,
    }));

    return NextResponse.json(body);
  } catch (error) {
    console.error('Error fetching individual services for visitor:', error);
    return NextResponse.json(
      { error: 'Failed to fetch individual services' },
      { status: 500 },
    );
  }
}
