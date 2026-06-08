import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getActiveServiceCatalog } from '@/lib/db/queries';

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || !modules.includes('operator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const services = await getActiveServiceCatalog();
    const body = services.map((row) => ({
      id: row.id,
      name: row.name,
      sortOrder: row.sortOrder,
    }));

    return NextResponse.json(body);
  } catch (error) {
    console.error('Error fetching individual services:', error);
    return NextResponse.json(
      { error: 'Failed to fetch individual services' },
      { status: 500 },
    );
  }
}
