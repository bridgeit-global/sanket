import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { hasModuleAccess, updateDailyProgrammeSortOrders } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await hasModuleAccess(
      session.user.id,
      'daily-programme',
    );
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const items = Array.isArray(body?.items) ? body.items : [];

    const normalized = items
      .filter((it: any) => typeof it?.id === 'string' && Number.isFinite(it?.sortOrder))
      .map((it: any) => ({ id: it.id, sortOrder: Number(it.sortOrder) }));

    if (normalized.length === 0) {
      return NextResponse.json({ error: 'items is required' }, { status: 400 });
    }

    await updateDailyProgrammeSortOrders(normalized, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering daily programme items:', error);
    return NextResponse.json(
      { error: 'Failed to reorder daily programme items' },
      { status: 500 },
    );
  }
}

