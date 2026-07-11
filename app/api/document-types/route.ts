import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  createDocumentType,
  getDocumentTypes,
  hasModuleAccess,
} from '@/lib/db/queries';
import { normalizeReferencePrefix } from '@/lib/letters/reference-sequence';

async function canReadDocumentTypes(userId: string): Promise<boolean> {
  const [letter, outward, inward] = await Promise.all([
    hasModuleAccess(userId, 'letter-generation'),
    hasModuleAccess(userId, 'outward'),
    hasModuleAccess(userId, 'inward'),
  ]);
  return letter || outward || inward;
}

async function canWriteDocumentTypes(userId: string): Promise<boolean> {
  const [letter, outward] = await Promise.all([
    hasModuleAccess(userId, 'letter-generation'),
    hasModuleAccess(userId, 'outward'),
  ]);
  return letter || outward;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await canReadDocumentTypes(session.user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const includeInactive =
      request.nextUrl.searchParams.get('includeInactive') === 'true';
    const documentTypes = await getDocumentTypes({
      activeOnly: !includeInactive,
    });

    return NextResponse.json({ documentTypes });
  } catch (error) {
    console.error('Error fetching document types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document types' },
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
    if (!(await canWriteDocumentTypes(session.user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const code = normalizeReferencePrefix(String(body?.code ?? ''));
    const labelEn = String(body?.labelEn ?? '').trim();
    const labelMr = String(body?.labelMr ?? '').trim();
    const isActive = body?.isActive !== false;
    const sortOrder = Number.isFinite(Number(body?.sortOrder))
      ? Number(body.sortOrder)
      : 0;

    if (!code || !labelEn || !labelMr) {
      return NextResponse.json(
        { error: 'code, labelEn, and labelMr are required' },
        { status: 400 },
      );
    }

    const documentType = await createDocumentType({
      code,
      labelEn,
      labelMr,
      isActive,
      sortOrder,
      createdBy: session.user.id,
    });

    return NextResponse.json({ documentType }, { status: 201 });
  } catch (error) {
    console.error('Error creating document type:', error);
    const message =
      error instanceof Error && error.message.includes('duplicate')
        ? 'A document type with this code already exists'
        : 'Failed to create document type';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
