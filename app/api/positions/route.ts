import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  createPositionMaster,
  getPositionMasters,
  updatePositionMaster,
} from '@/lib/db/queries';

async function requireLetterModule() {
  const session = await auth();
  const modules = (session?.user?.modules as string[]) || [];
  if (!session?.user || !modules.includes('letter-generation')) {
    return null;
  }
  return session;
}

export async function GET(request: NextRequest) {
  try {
    if (!(await requireLetterModule())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const includeInactive =
      request.nextUrl.searchParams.get('includeInactive') === 'true';
    const positions = await getPositionMasters({ activeOnly: !includeInactive });
    return NextResponse.json({ positions });
  } catch (error) {
    console.error('Error fetching positions:', error);
    return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireLetterModule();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const titleEn = String(body?.titleEn ?? '').trim();
    const titleMr = String(body?.titleMr ?? '').trim();
    const code = String(body?.code ?? '').trim() || null;
    if (!titleEn) {
      return NextResponse.json({ error: 'titleEn is required' }, { status: 400 });
    }
    const position = await createPositionMaster({
      titleEn,
      titleMr,
      code,
      isActive: body?.isActive !== false,
      sortOrder: Number.isFinite(Number(body?.sortOrder))
        ? Number(body.sortOrder)
        : 0,
      createdBy: session.user.id,
    });
    return NextResponse.json({ position }, { status: 201 });
  } catch (error) {
    console.error('Error creating position:', error);
    return NextResponse.json({ error: 'Failed to create position' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireLetterModule();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const id = String(body?.id ?? '').trim();
    const titleEn = String(body?.titleEn ?? '').trim();
    const titleMr = String(body?.titleMr ?? '').trim();
    const code = String(body?.code ?? '').trim() || null;
    if (!id || !titleEn) {
      return NextResponse.json(
        { error: 'id and titleEn are required' },
        { status: 400 },
      );
    }
    const position = await updatePositionMaster({
      id,
      titleEn,
      titleMr,
      code,
      isActive: body?.isActive !== false,
      sortOrder: Number.isFinite(Number(body?.sortOrder))
        ? Number(body.sortOrder)
        : 0,
      updatedBy: session.user.id,
    });
    return NextResponse.json({ position });
  } catch (error) {
    console.error('Error updating position:', error);
    return NextResponse.json({ error: 'Failed to update position' }, { status: 500 });
  }
}
