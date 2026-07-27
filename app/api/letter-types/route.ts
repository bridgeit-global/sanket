import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { isUserAdmin } from '@/lib/db/cadre-queries';
import {
  createLetterTypeMaster,
  getLetterTypeMasters,
} from '@/lib/db/queries';
import {
  getBuiltInLetterTypeOptions,
  isValidLetterTypeCode,
  normalizeLetterTypeCode,
  type LetterTypeOption,
} from '@/lib/letters/letter-type-options';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || !modules.includes('letter-generation')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const includeInactive =
      request.nextUrl.searchParams.get('includeInactive') === 'true';
    const custom = await getLetterTypeMasters({ includeInactive });

    const builtIns: LetterTypeOption[] = getBuiltInLetterTypeOptions();
    const customs: LetterTypeOption[] = custom.map((row) => ({
      code: row.code,
      labelEn: row.labelEn,
      labelMr: row.labelMr,
      formBase: 'general',
      isBuiltIn: false,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
      id: row.id,
    }));

    const letterTypes = [...builtIns, ...customs].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code),
    );

    return NextResponse.json({ letterTypes });
  } catch (error) {
    console.error('Error fetching letter types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch letter types' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { code, labelEn, labelMr, sortOrder } = body ?? {};
    const normalized = normalizeLetterTypeCode(String(code ?? ''));

    if (!isValidLetterTypeCode(normalized) || !labelEn || !labelMr) {
      return NextResponse.json(
        {
          error:
            'code (kebab-case), labelEn, and labelMr are required',
        },
        { status: 400 },
      );
    }

    const letterType = await createLetterTypeMaster({
      code: normalized,
      labelEn: String(labelEn).trim(),
      labelMr: String(labelMr).trim(),
      formBase: 'general',
      sortOrder:
        Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 100,
      createdBy: session.user.id,
    });

    return NextResponse.json({ letterType }, { status: 201 });
  } catch (error) {
    console.error('Error creating letter type:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to create letter type';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
