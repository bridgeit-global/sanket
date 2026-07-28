import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  deleteServiceCatalogEntry,
  getServiceCatalogById,
  hasModuleAccess,
  updateServiceCatalogEntry,
} from '@/lib/db/queries';
import { normalizeLetterTypeCode } from '@/lib/letters/letter-type-options';

async function canWriteServiceCatalog(userId: string): Promise<boolean> {
  return hasModuleAccess(userId, 'letter-generation');
}

function normalizeOptionalLetterType(value: unknown): string | null {
  if (value == null || value === '') return null;
  const code = normalizeLetterTypeCode(String(value));
  return code || null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const [letter, operator] = await Promise.all([
      hasModuleAccess(session.user.id, 'letter-generation'),
      hasModuleAccess(session.user.id, 'operator'),
    ]);
    if (!letter && !operator) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const service = await getServiceCatalogById(id);
    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }
    return NextResponse.json({ service });
  } catch (error) {
    console.error('Error fetching service catalog entry:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service catalog entry' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await canWriteServiceCatalog(session.user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await getServiceCatalogById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    const body = await request.json();
    const name =
      body?.name !== undefined ? String(body.name).trim() : undefined;
    if (name !== undefined && !name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const category =
      body?.category === undefined
        ? undefined
        : body.category == null
          ? null
          : String(body.category).trim() || null;
    const letterType =
      body?.letterType === undefined
        ? undefined
        : normalizeOptionalLetterType(body.letterType);
    const sortOrder =
      body?.sortOrder === undefined ? undefined : Number(body.sortOrder);
    const isActive =
      body?.isActive === undefined ? undefined : Boolean(body.isActive);

    const service = await updateServiceCatalogEntry({
      id,
      name,
      category,
      letterType,
      sortOrder:
        sortOrder !== undefined && Number.isFinite(sortOrder)
          ? sortOrder
          : undefined,
      isActive,
    });

    return NextResponse.json({ service });
  } catch (error) {
    console.error('Error updating service catalog entry:', error);
    const message = error instanceof Error ? error.message : '';
    if (message.includes('duplicate') || message.includes('unique')) {
      return NextResponse.json(
        { error: 'A service with this name already exists' },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: 'Failed to update service catalog entry' },
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
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await canWriteServiceCatalog(session.user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await getServiceCatalogById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    await deleteServiceCatalogEntry(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting service catalog entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete service catalog entry' },
      { status: 500 },
    );
  }
}
