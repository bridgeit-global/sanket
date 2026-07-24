import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  getLetterById,
  updateLetterPdfStoragePath,
} from '@/lib/db/queries';
import {
  LETTER_PDF_BUCKET,
  LETTER_PDF_MAX_BYTES,
  letterPdfStoragePath,
} from '@/lib/letters/pdf-storage';
import { supabase } from '@/lib/supabase/server';

const SIGNED_URL_TTL_SECONDS = 60;

async function requireLetterGenerationAccess() {
  const session = await auth();
  const modules = (session?.user?.modules as string[]) || [];
  if (!session?.user || !modules.includes('letter-generation')) {
    return null;
  }
  return session;
}

/** Upload (or replace) the PDF for a saved letter in private Storage. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireLetterGenerationAccess();
    if (!session) {
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

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 },
      );
    }
    if (file.size > LETTER_PDF_MAX_BYTES) {
      return NextResponse.json(
        { error: 'File size should be less than 10MB' },
        { status: 400 },
      );
    }

    const storagePath = letterPdfStoragePath(id);
    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(LETTER_PDF_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Failed to upload letter PDF:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload PDF' },
        { status: 500 },
      );
    }

    const updated = await updateLetterPdfStoragePath({
      id,
      pdfStoragePath: storagePath,
    });

    return NextResponse.json({ letter: updated });
  } catch (error) {
    console.error('Error uploading letter PDF:', error);
    return NextResponse.json(
      { error: 'Failed to upload PDF' },
      { status: 500 },
    );
  }
}

/** Return a short-lived signed URL to download the stored letter PDF. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireLetterGenerationAccess();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const letter = await getLetterById(id);
    if (!letter?.pdfStoragePath) {
      return NextResponse.json(
        { error: 'PDF not found for this letter' },
        { status: 404 },
      );
    }

    const { data, error } = await supabase.storage
      .from(LETTER_PDF_BUCKET)
      .createSignedUrl(letter.pdfStoragePath, SIGNED_URL_TTL_SECONDS, {
        download: `${letter.title}-${letter.referenceNo || 'letter'}.pdf`,
      });

    if (error || !data?.signedUrl) {
      console.error('Failed to sign letter PDF URL:', error);
      return NextResponse.json(
        { error: 'Failed to create download link' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      url: data.signedUrl,
      pdfStoragePath: letter.pdfStoragePath,
    });
  } catch (error) {
    console.error('Error fetching letter PDF URL:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PDF' },
      { status: 500 },
    );
  }
}
