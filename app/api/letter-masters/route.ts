import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { createLetterMaster, getLetterMasters } from '@/lib/db/queries';
import { resolveLetterPaperSize } from '@/lib/letters/paper-size';
import { normalizeLetterheadMode } from '@/lib/letters/render-template';
import { LETTER_TYPES, type LetterLocale, type LetterType } from '@/lib/letters/templates';
const LETTER_LOCALES: LetterLocale[] = ['en', 'mr'];

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || !modules.includes('letter-generation')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const letterMasters = await getLetterMasters();
    return NextResponse.json({ letterMasters });
  } catch (error) {
    console.error('Error fetching letter masters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch letter masters' },
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

    const body = await request.json();
    const {
      name,
      letterType,
      letterLocale,
      templateHtml,
      letterheadUrl,
      letterheadMode,
      paperSize,
    } = body ?? {};

    if (!name || !letterType || !letterLocale || !templateHtml) {
      return NextResponse.json(
        { error: 'name, letterType, letterLocale, and templateHtml are required' },
        { status: 400 },
      );
    }

    if (!LETTER_TYPES.includes(letterType)) {
      return NextResponse.json({ error: 'Invalid letter type' }, { status: 400 });
    }

    if (!LETTER_LOCALES.includes(letterLocale)) {
      return NextResponse.json({ error: 'Invalid letter locale' }, { status: 400 });
    }

    const letterMaster = await createLetterMaster({
      name: String(name),
      letterType: String(letterType),
      letterLocale: String(letterLocale),
      templateHtml: String(templateHtml),
      letterheadUrl: letterheadUrl ? String(letterheadUrl) : null,
      letterheadMode: normalizeLetterheadMode(letterheadMode),
      paperSize: resolveLetterPaperSize(paperSize, letterType),
      createdBy: session.user.id,
    });

    return NextResponse.json({ letterMaster }, { status: 201 });
  } catch (error) {
    console.error('Error creating letter master:', error);
    const message =
      error instanceof Error && error.message.includes('already exists')
        ? 'A template already exists for this letter type and locale'
        : 'Failed to create letter master';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
