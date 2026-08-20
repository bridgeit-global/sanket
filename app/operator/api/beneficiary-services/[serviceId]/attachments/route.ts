import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  getBeneficiaryServiceById,
  getBeneficiaryServiceAttachments,
  createBeneficiaryServiceAttachment,
  deleteBeneficiaryServiceAttachment,
} from '@/lib/db/queries';
import {
  buildAppUploadPath,
  removeStoredPublicUrl,
  uploadAppFile,
} from '@/lib/storage/app-uploads';

// Allowed file types for document / image uploads
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

function hasOperatorAccess(
  session: { user?: { modules?: unknown } } | null,
): boolean {
  const modules = (session?.user?.modules as string[]) || [];
  return Boolean(session?.user) && modules.includes('operator');
}

// GET - List attachments for a beneficiary service
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> },
) {
  try {
    const session = await auth();
    const { serviceId } = await params;

    if (!hasOperatorAccess(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = await getBeneficiaryServiceById(serviceId);
    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    const attachments = await getBeneficiaryServiceAttachments(serviceId);
    return NextResponse.json(attachments);
  } catch (error) {
    console.error('Error fetching beneficiary service attachments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attachments' },
      { status: 500 },
    );
  }
}

// POST - Upload a new attachment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> },
) {
  try {
    const session = await auth();
    const { serviceId } = await params;

    if (!hasOperatorAccess(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = await getBeneficiaryServiceById(serviceId);
    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
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
            'File type not allowed. Accepted: images (JPG, PNG, WEBP, HEIC, GIF), PDF, Word, Excel, text',
        },
        { status: 400 },
      );
    }

    const path = buildAppUploadPath(
      `beneficiary-services/${serviceId}`,
      file.name,
    );
    const uploaded = await uploadAppFile({
      path,
      body: await file.arrayBuffer(),
      contentType: file.type || 'application/octet-stream',
    });

    const attachment = await createBeneficiaryServiceAttachment({
      serviceId,
      fileName: file.name,
      fileSizeKb: Math.round(file.size / 1024),
      fileUrl: uploaded.url,
      performedBy: session?.user?.id,
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error('Error uploading beneficiary service attachment:', error);
    return NextResponse.json(
      { error: 'Failed to upload attachment' },
      { status: 500 },
    );
  }
}

// DELETE - Remove an attachment (?attachmentId=...)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> },
) {
  try {
    const session = await auth();
    const { serviceId } = await params;

    if (!hasOperatorAccess(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = await getBeneficiaryServiceById(serviceId);
    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('attachmentId');

    if (!attachmentId) {
      return NextResponse.json(
        { error: 'Attachment ID is required' },
        { status: 400 },
      );
    }

    const attachments = await getBeneficiaryServiceAttachments(serviceId);
    const attachment = attachments.find((a) => a.id === attachmentId);

    if (!attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 },
      );
    }

    await removeStoredPublicUrl(attachment.fileUrl);

    await deleteBeneficiaryServiceAttachment(attachmentId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting beneficiary service attachment:', error);
    return NextResponse.json(
      { error: 'Failed to delete attachment' },
      { status: 500 },
    );
  }
}
