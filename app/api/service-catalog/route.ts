import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  createServiceCatalogEntry,
  getServiceCatalog,
  hasModuleAccess,
} from '@/lib/db/queries';
import { normalizeLetterTypeCode } from '@/lib/letters/letter-type-options';

async function canReadServiceCatalog(userId: string): Promise<boolean> {
  const [letter, operator] = await Promise.all([
    hasModuleAccess(userId, 'letter-generation'),
    hasModuleAccess(userId, 'operator'),
  ]);
  return letter || operator;
}

async function canWriteServiceCatalog(userId: string): Promise<boolean> {
  return hasModuleAccess(userId, 'letter-generation');
}

function normalizeOptionalLetterType(value: unknown): string | null {
  if (value == null || value === '') return null;
  const code = normalizeLetterTypeCode(String(value));
  return code || null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await canReadServiceCatalog(session.user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const includeInactive =
      request.nextUrl.searchParams.get('includeInactive') === 'true';
    const services = await getServiceCatalog({ includeInactive });
    return NextResponse.json({ services });
  } catch (error) {
    console.error('Error fetching service catalog:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service catalog' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await canWriteServiceCatalog(session.user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const name = String(body?.name ?? '').trim();
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const category =
      body?.category == null ? null : String(body.category).trim() || null;
    const letterType = normalizeOptionalLetterType(body?.letterType);
    const sortOrder = Number(body?.sortOrder);
    const isActive = body?.isActive !== false;

    const service = await createServiceCatalogEntry({
      name,
      category,
      letterType,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : undefined,
      isActive,
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    console.error('Error creating service catalog entry:', error);
    const message = error instanceof Error ? error.message : '';
    if (message.includes('duplicate') || message.includes('unique')) {
      return NextResponse.json(
        { error: 'A service with this name already exists' },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: 'Failed to create service catalog entry' },
      { status: 500 },
    );
  }
}
