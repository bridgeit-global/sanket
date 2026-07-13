import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { supabase } from '@/lib/supabase/server';
import { createShortUrl } from '@/lib/db/short-url-queries';
import { logSirActivity } from '@/lib/db/queries';

const SIR_PROFILE_BUCKET = 'sir-profiles';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const LINK_EXPIRY_DAYS = 7;

// Uploads a SIR voter-profile PDF to a private Storage bucket and returns a
// short, shareable link (backed by an expiring short URL) for WhatsApp sharing.
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || !modules.includes('sir')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const epicNumber = formData.get('epicNumber');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    if (typeof epicNumber !== 'string' || !epicNumber.trim()) {
      return NextResponse.json(
        { error: 'epicNumber is required' },
        { status: 400 },
      );
    }
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 },
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size should be less than 10MB' },
        { status: 400 },
      );
    }

    const safeEpic = epicNumber.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    const storagePath = `${safeEpic}/${Date.now()}.pdf`;
    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(SIR_PROFILE_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('Failed to upload SIR profile PDF:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload document' },
        { status: 500 },
      );
    }

    const { code } = await createShortUrl({
      storageBucket: SIR_PROFILE_BUCKET,
      storagePath,
      createdBy: session.user.id,
      expiresInDays: LINK_EXPIRY_DAYS,
    });

    await logSirActivity('share', epicNumber.trim(), session.user.id);

    const shortUrl = `${request.nextUrl.origin}/s/${code}`;
    return NextResponse.json({ shortUrl });
  } catch (error) {
    console.error('Error creating SIR share link:', error);
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 },
    );
  }
}
