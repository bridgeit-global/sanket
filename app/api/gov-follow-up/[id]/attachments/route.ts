import { type NextRequest, NextResponse } from 'next/server';
import { requireGovFollowUpAccess } from '@/lib/gov-follow-up/access';
import {
  createGovFollowUpAttachment,
  deleteGovFollowUpAttachment,
  getGovFollowUpAttachments,
  getGovFollowUpMatterById,
} from '@/lib/db/gov-follow-up';
import {
  buildAppUploadPath,
  uploadAppFile,
} from '@/lib/storage/app-uploads';
import { ChatSDKError } from '@/lib/errors';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/bmp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.heic',
  '.heif',
  '.bmp',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.txt',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function isAllowedUpload(file: File): boolean {
  const mime = (file.type || '').toLowerCase();
  if (mime && ALLOWED_MIME_TYPES.includes(mime)) return true;
  if (mime.startsWith('image/')) return true;
  const name = file.name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireGovFollowUpAccess();
    if (error || !session) return error;

    const { id } = await params;
    const matter = await getGovFollowUpMatterById(id);
    if (!matter) {
      return NextResponse.json({ error: 'Matter not found' }, { status: 404 });
    }

    const attachments = await getGovFollowUpAttachments(id);
    return NextResponse.json(attachments);
  } catch (err) {
    console.error('Error fetching follow-up attachments:', err);
    return NextResponse.json(
      { error: 'Failed to fetch attachments' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireGovFollowUpAccess();
    if (error || !session) return error;

    const { id } = await params;
    const matter = await getGovFollowUpMatterById(id);
    if (!matter) {
      return NextResponse.json({ error: 'Matter not found' }, { status: 404 });
    }

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
    if (!isAllowedUpload(file)) {
      return NextResponse.json(
        {
          error:
            'File type not allowed. Accepted: images, PDF, Word, Excel, text',
        },
        { status: 400 },
      );
    }

    const path = buildAppUploadPath(`gov-follow-up/${id}`, file.name);
    const uploaded = await uploadAppFile({
      path,
      body: await file.arrayBuffer(),
      contentType: file.type || 'application/octet-stream',
    });

    const attachment = await createGovFollowUpAttachment({
      matterId: id,
      fileName: file.name,
      fileSizeKb: Math.max(1, Math.round(file.size / 1024)),
      fileUrl: uploaded.url,
      createdBy: session.user.id,
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (err) {
    console.error('Error uploading follow-up attachment:', err);
    const message =
      err instanceof ChatSDKError
        ? String(err.cause || err.message)
        : 'Failed to upload attachment';
    const status = err instanceof ChatSDKError ? err.statusCode : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireGovFollowUpAccess();
    if (error || !session) return error;

    const { id } = await params;
    const matter = await getGovFollowUpMatterById(id);
    if (!matter) {
      return NextResponse.json({ error: 'Matter not found' }, { status: 404 });
    }

    const attachmentId = new URL(request.url).searchParams.get('attachmentId');
    if (!attachmentId) {
      return NextResponse.json(
        { error: 'Attachment ID is required' },
        { status: 400 },
      );
    }

    await deleteGovFollowUpAttachment({
      matterId: id,
      attachmentId,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting follow-up attachment:', err);
    const message =
      err instanceof ChatSDKError
        ? String(err.cause || err.message)
        : 'Failed to delete attachment';
    const status = err instanceof ChatSDKError ? err.statusCode : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
