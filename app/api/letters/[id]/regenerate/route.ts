import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  getLetterById,
  getLetterMasterById,
  getLetterMasterByTypeAndLocale,
  updateLetterRenderedHtml,
} from '@/lib/db/queries';
import { buildRenderedLetterHtml } from '@/lib/letters/render-template';
import {
  resolveLegacyRationLetterType,
  type LetterLocale,
  type LetterType,
} from '@/lib/letters/templates';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || !modules.includes('letter-generation')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const letter = await getLetterById(id);
    if (!letter) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 });
    }

    const letterFields = letter.fields as Record<string, unknown> | null;
    const resolvedLetterType =
      letter.letterType === 'ration'
        ? resolveLegacyRationLetterType(
            letter.letterType,
            letterFields?.purpose,
          )
        : (letter.letterType as LetterType);

    const master = letter.letterMasterId
      ? await getLetterMasterById(letter.letterMasterId)
      : await getLetterMasterByTypeAndLocale({
          letterType: resolvedLetterType,
          letterLocale: letter.letterLocale,
        });

    if (!master) {
      return NextResponse.json(
        { error: 'Letter template not found for regeneration' },
        { status: 404 },
      );
    }

    const renderedHtml = buildRenderedLetterHtml(
      resolvedLetterType,
      master.templateHtml,
      letter.fields as Parameters<typeof buildRenderedLetterHtml>[2],
      letter.letterLocale as LetterLocale,
      master.letterheadUrl,
      master.letterheadMode,
    );

    const updatedLetter = await updateLetterRenderedHtml({
      id,
      renderedHtml,
      letterMasterId: master.id,
    });

    return NextResponse.json({ letter: updatedLetter });
  } catch (error) {
    console.error('Error regenerating letter:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate letter' },
      { status: 500 },
    );
  }
}
