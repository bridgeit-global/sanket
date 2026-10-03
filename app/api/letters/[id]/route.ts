import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { deleteLetter, getLetterById, updateLetterDraft } from '@/lib/db/queries';
import { toLocaleDigits, toWesternDigits } from '@/lib/locale-digits';
import {
  formatReference,
  parseReference,
} from '@/lib/letters/reference-sequence';
import { resolveLetterPaperSize } from '@/lib/letters/paper-size';

function replaceReferenceInHtml(
  html: string,
  oldNumber: string,
  newNumber: number,
  locale: string,
): string {
  const oldWestern = toWesternDigits(oldNumber).replace(/\D/g, '');
  if (!oldWestern) return html;
  const newWestern = String(newNumber);
  const oldLocalized = toLocaleDigits(oldWestern, locale === 'mr' ? 'mr' : 'en');
  const newLocalized = toLocaleDigits(newWestern, locale === 'mr' ? 'mr' : 'en');
  return html
    .split(oldLocalized)
    .join(newLocalized)
    .split(oldWestern)
    .join(newWestern);
}

export async function PATCH(
  request: Request,
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

    const existing = await getLetterById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 });
    }
    if (existing.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only a draft letter can be edited' },
        { status: 409 },
      );
    }

    const body = await request.json();
    const {
      letterType,
      letterLocale,
      letterMasterId,
      title,
      fields,
      renderedHtml,
      paperSize,
    } = body ?? {};

    if (!letterType || !letterLocale || !title || !renderedHtml) {
      return NextResponse.json(
        { error: 'letterType, letterLocale, title, and renderedHtml are required' },
        { status: 400 },
      );
    }

    const locale = String(letterLocale);
    const stored = parseReference(existing.referenceNo);
    const storedNumber = Number(stored.number);
    const localizedNumber =
      stored.number && Number.isFinite(storedNumber)
        ? toLocaleDigits(String(storedNumber), locale === 'mr' ? 'mr' : 'en')
        : '';

    const nextFields =
      fields && typeof fields === 'object'
        ? {
            ...fields,
            referencePrefix: stored.prefix || fields.referencePrefix,
            referenceNo: localizedNumber || fields.referenceNo,
          }
        : fields;

    let nextHtml = String(renderedHtml);
    const clientNumber = String(fields?.referenceNo ?? '');
    if (clientNumber && stored.number && Number.isFinite(storedNumber)) {
      nextHtml = replaceReferenceInHtml(
        nextHtml,
        clientNumber,
        storedNumber,
        locale,
      );
      const clientFull = formatReference(stored.prefix, clientNumber);
      if (clientFull && clientFull !== existing.referenceNo) {
        nextHtml = nextHtml.split(clientFull).join(existing.referenceNo);
      }
    }

    const result = await updateLetterDraft({
      id,
      letterMasterId: letterMasterId ? String(letterMasterId) : null,
      letterType: String(letterType),
      letterLocale: locale,
      title: String(title),
      fields: nextFields,
      renderedHtml: nextHtml,
      paperSize: resolveLetterPaperSize(paperSize, letterType),
    });

    if ('error' in result) {
      if (result.error === 'not_found') {
        return NextResponse.json({ error: 'Letter not found' }, { status: 404 });
      }
      return NextResponse.json(
        { error: 'Only a draft letter can be edited' },
        { status: 409 },
      );
    }

    return NextResponse.json({ letter: result.letter });
  } catch (error) {
    console.error('Error updating letter draft:', error);
    return NextResponse.json(
      { error: 'Failed to update letter' },
      { status: 500 },
    );
  }
}

export async function DELETE(
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

    await deleteLetter(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting letter:', error);
    return NextResponse.json(
      { error: 'Failed to delete letter' },
      { status: 500 },
    );
  }
}

