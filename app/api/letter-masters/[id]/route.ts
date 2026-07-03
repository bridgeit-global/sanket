import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getLetterMasterById, updateLetterMaster } from '@/lib/db/queries';
import { normalizeLetterheadMode } from '@/lib/letters/render-template';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || !modules.includes('letter-generation')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const letterMaster = await getLetterMasterById(id);
    if (!letterMaster) {
      return NextResponse.json({ error: 'Letter master not found' }, { status: 404 });
    }

    return NextResponse.json({ letterMaster });
  } catch (error) {
    console.error('Error fetching letter master:', error);
    return NextResponse.json(
      { error: 'Failed to fetch letter master' },
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
    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || !modules.includes('letter-generation')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, templateHtml, letterheadUrl, letterheadMode } = body ?? {};

    if (!name || !templateHtml) {
      return NextResponse.json(
        { error: 'name and templateHtml are required' },
        { status: 400 },
      );
    }

    const existing = await getLetterMasterById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Letter master not found' }, { status: 404 });
    }

    const letterMaster = await updateLetterMaster({
      id,
      name: String(name),
      templateHtml: String(templateHtml),
      letterheadUrl:
        letterheadUrl === undefined
          ? existing.letterheadUrl
          : letterheadUrl
            ? String(letterheadUrl)
            : null,
      letterheadMode:
        letterheadMode === undefined
          ? existing.letterheadMode
          : normalizeLetterheadMode(letterheadMode),
      updatedBy: session.user.id,
    });

    return NextResponse.json({ letterMaster });
  } catch (error) {
    console.error('Error updating letter master:', error);
    return NextResponse.json(
      { error: 'Failed to update letter master' },
      { status: 500 },
    );
  }
}
