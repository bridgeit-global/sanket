import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { createLetter, getLetters } from '@/lib/db/queries';

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
      referenceNo,
      title,
      fields,
      body: letterBody,
    } = body ?? {};

    if (!letterType || !letterLocale || !title || !letterBody) {
      return NextResponse.json(
        { error: 'letterType, letterLocale, title, and body are required' },
        { status: 400 },
      );
    }

    const letter = await createLetter({
      letterType: String(letterType),
      letterLocale: String(letterLocale),
      referenceNo: referenceNo != null ? String(referenceNo) : null,
      title: String(title),
      fields: fields ?? {},
      body: String(letterBody),
      createdBy: session.user.id,
    });

    return NextResponse.json({ letter }, { status: 201 });
  } catch (error) {
    console.error('Error creating letter:', error);
    return NextResponse.json(
      { error: 'Failed to create letter' },
      { status: 500 },
    );
  }
}

