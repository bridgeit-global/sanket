import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { canAccessFundRequestLetters } from '@/lib/adm/fund-request-letter-access';
import { getAdmFundRequestLetterById } from '@/lib/db/queries';
import {
  LETTER_PDF_BUCKET,
  contentDispositionAttachment,
} from '@/lib/letters/pdf-storage';
import { supabase } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await canAccessFundRequestLetters(session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const letter = await getAdmFundRequestLetterById(id);
    if (!letter?.storagePath) {
      return NextResponse.json(
        { error: 'Request letter not found' },
        { status: 404 },
      );
    }

    const { data, error } = await supabase.storage
      .from(LETTER_PDF_BUCKET)
      .download(letter.storagePath);

    if (error || !data) {
      console.error('Failed to download request letter PDF:', error);
      return NextResponse.json(
        { error: 'Failed to download PDF' },
        { status: 500 },
      );
    }

    const fileName = letter.fileName.toLowerCase().endsWith('.pdf')
      ? letter.fileName
      : `${letter.fileName}.pdf`;
    const forceDownload =
      request.nextUrl.searchParams.get('download') === '1';
    const disposition = forceDownload
      ? contentDispositionAttachment(fileName)
      : contentDispositionAttachment(fileName).replace(/^attachment;/, 'inline;');

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': disposition,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Error fetching request letter PDF:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PDF' },
      { status: 500 },
    );
  }
}
