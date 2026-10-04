import { type NextRequest, NextResponse } from 'next/server';
import { requireGovFollowUpAccess } from '@/lib/gov-follow-up/access';
import { uploadGovFollowUpInwardLetter } from '@/lib/db/gov-follow-up';
import { canAccessInwardRegister } from '@/lib/register/access';
import { ChatSDKError } from '@/lib/errors';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireGovFollowUpAccess();
    if (error || !session) return error;

    const hasInward = await canAccessInwardRegister(session.user.id);
    if (!hasInward) {
      return NextResponse.json(
        { error: 'Inward register access is required to upload letters' },
        { status: 403 },
      );
    }

    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size should be less than 10MB' },
        { status: 400 },
      );
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            'File type not allowed. Accepted: PDF, images, Word documents',
        },
        { status: 400 },
      );
    }

    const refNo = String(formData.get('refNo') ?? '').trim() || null;
    const date = String(formData.get('date') ?? '').trim() || null;
    const fromTo = String(formData.get('fromTo') ?? '').trim() || null;

    const matter = await uploadGovFollowUpInwardLetter({
      matterId: id,
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type || 'application/octet-stream',
      body: await file.arrayBuffer(),
      refNo,
      date,
      fromTo,
      performedBy: session.user.id,
    });

    return NextResponse.json(matter, { status: 201 });
  } catch (err) {
    console.error('Error uploading follow-up letter:', err);
    const message =
      err instanceof ChatSDKError
        ? String(err.cause || err.message)
        : 'Failed to upload letter';
    const status = err instanceof ChatSDKError ? err.statusCode : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
