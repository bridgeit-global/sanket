import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  createLetter,
  getLetterByReferenceNo,
  getLetters,
  resolveDocumentTypeReferenceForSave,
} from '@/lib/db/queries';
import { toWesternDigits, toLocaleDigits } from '@/lib/locale-digits';
import {
  coerceDocumentType,
  formatReference,
  normalizeReferencePrefix,
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

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || !modules.includes('letter-generation')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = Math.max(1, Math.min(200, Number(limitParam ?? 50) || 50));

    const letters = await getLetters({ limit });
    return NextResponse.json({ letters });
  } catch (error) {
    console.error('Error fetching letters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch letters' },
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
      letterType,
      letterLocale,
      letterMasterId,
      referenceNo,
      referencePrefix,
      autoSequence,
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

    const parsedClientRef = parseReference(
      referenceNo != null ? String(referenceNo).trim() : '',
    );
    const prefixFromBody = normalizeReferencePrefix(
      String(referencePrefix ?? fields?.referencePrefix ?? ''),
    );
    const rawPrefix = prefixFromBody || parsedClientRef.prefix;
    const code = coerceDocumentType(rawPrefix) ?? rawPrefix;

    if (!code) {
      return NextResponse.json(
        { error: 'referencePrefix / document type is required' },
        { status: 400 },
      );
    }

    const resolved = await resolveDocumentTypeReferenceForSave({
      code,
      autoSequence: autoSequence !== false,
      clientNumber: parsedClientRef.number || fields?.referenceNo,
    });

    const existingLetter = await getLetterByReferenceNo(resolved.fullReference);
    if (existingLetter) {
      return NextResponse.json(
        { error: 'referenceNo already exists' },
        { status: 409 },
      );
    }

    const locale = String(letterLocale);
    const localizedNumber = toLocaleDigits(
      String(resolved.number),
      locale === 'mr' ? 'mr' : 'en',
    );
    const nextFields =
      fields && typeof fields === 'object'
        ? {
            ...fields,
            referencePrefix: resolved.code,
            referenceNo: localizedNumber,
          }
        : {
            referencePrefix: resolved.code,
            referenceNo: localizedNumber,
          };

    let nextHtml = String(renderedHtml);
    const clientNumber = parsedClientRef.number || String(fields?.referenceNo ?? '');
    if (clientNumber) {
      nextHtml = replaceReferenceInHtml(
        nextHtml,
        clientNumber,
        resolved.number,
        locale,
      );
      const clientFull = formatReference(code, clientNumber);
      if (clientFull && clientFull !== resolved.fullReference) {
        nextHtml = nextHtml.split(clientFull).join(resolved.fullReference);
      }
    }

    const letter = await createLetter({
      letterMasterId: letterMasterId ? String(letterMasterId) : null,
      letterType: String(letterType),
      letterLocale: locale,
      referenceNo: resolved.fullReference,
      title: String(title),
      fields: nextFields,
      renderedHtml: nextHtml,
      paperSize: resolveLetterPaperSize(paperSize, letterType),
      createdBy: session.user.id,
    });

    return NextResponse.json({ letter }, { status: 201 });
  } catch (error) {
    console.error('Error creating letter:', error);
    const message = error instanceof Error ? error.message : '';
    const cause =
      error instanceof Error && 'cause' in error && typeof error.cause === 'string'
        ? error.cause
        : '';
    const detail = `${message} ${cause}`;
    if (detail.includes('duplicate key') || detail.includes('unique')) {
      return NextResponse.json(
        { error: 'referenceNo already exists' },
        { status: 409 },
      );
    }
    if (detail.includes('Document type not found') || detail.includes('inactive')) {
      return NextResponse.json(
        { error: cause || 'Document type not found or inactive' },
        { status: 400 },
      );
    }
    if (detail.includes('Reference number is required')) {
      return NextResponse.json(
        { error: cause || 'Reference number is required' },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Failed to create letter' },
      { status: 500 },
    );
  }
}
