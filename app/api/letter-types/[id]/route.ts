import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { isUserAdmin } from '@/lib/db/cadre-queries';
import {
  deleteLetterTypeMaster,
  updateLetterTypeMaster,
} from '@/lib/db/queries';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || !modules.includes('letter-generation')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await isUserAdmin(session.user.id);
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { labelEn, labelMr, isActive, sortOrder } = body ?? {};

    if (!labelEn || !labelMr) {
      return NextResponse.json(
        { error: 'labelEn and labelMr are required' },
        { status: 400 },
      );
    }

    const letterType = await updateLetterTypeMaster({
      id,
      labelEn: String(labelEn).trim(),
      labelMr: String(labelMr).trim(),
      isActive: isActive !== false,
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 100,
      updatedBy: session.user.id,
    });

    return NextResponse.json({ letterType });
  } catch (error) {
    console.error('Error updating letter type:', error);
    return NextResponse.json(
      { error: 'Failed to update letter type' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || !modules.includes('letter-generation')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await isUserAdmin(session.user.id);
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    await deleteLetterTypeMaster(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting letter type:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to delete letter type';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
