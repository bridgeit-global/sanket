import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { createLetter, getLetterByReferenceNo, getLetters } from '@/lib/db/queries';

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
      title,
      fields,
      renderedHtml,
    } = body ?? {};

    if (!letterType || !letterLocale || !title || !renderedHtml) {
      return NextResponse.json(
        { error: 'letterType, letterLocale, title, and renderedHtml are required' },
        { status: 400 },
      );
    }

    const normalizedReferenceNo =
      referenceNo != null ? String(referenceNo).trim() : '';
    if (!normalizedReferenceNo) {
      return NextResponse.json(
        { error: 'referenceNo is required' },
        { status: 400 },
      );
    }

    const existingLetter = await getLetterByReferenceNo(normalizedReferenceNo);
    if (existingLetter) {
      return NextResponse.json(
        { error: 'referenceNo already exists' },
        { status: 409 },
      );
    }

    const letter = await createLetter({
      letterMasterId: letterMasterId ? String(letterMasterId) : null,
      letterType: String(letterType),
      letterLocale: String(letterLocale),
      referenceNo: normalizedReferenceNo,
      title: String(title),
      fields: fields ?? {},
      renderedHtml: String(renderedHtml),
      createdBy: session.user.id,
    });

    return NextResponse.json({ letter }, { status: 201 });
  } catch (error) {
    console.error('Error creating letter:', error);
    const message = error instanceof Error ? error.message : '';
    if (message.includes('duplicate key') || message.includes('unique')) {
      return NextResponse.json(
        { error: 'referenceNo already exists' },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: 'Failed to create letter' },
      { status: 500 },
    );
  }
}

