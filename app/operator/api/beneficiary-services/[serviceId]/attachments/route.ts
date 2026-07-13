import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { auth } from '@/app/(auth)/auth';
import {
  getBeneficiaryServiceById,
  getBeneficiaryServiceAttachments,
  createBeneficiaryServiceAttachment,
  deleteBeneficiaryServiceAttachment,
} from '@/lib/db/queries';

// Allowed file types for document uploads (images + common documents)
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            'File type not allowed. Accepted: PDF, images, Word, Excel, text files',
        },
        { status: 400 },
      );
    }

    const filename = `beneficiary-services/${serviceId}/${Date.now()}-${file.name}`;
    const fileBuffer = await file.arrayBuffer();

    const blob = await put(filename, fileBuffer, {
      access: 'public',
      contentType: file.type,
    });

    const attachment = await createBeneficiaryServiceAttachment({
      serviceId,
      fileName: file.name,
      fileSizeKb: Math.round(file.size / 1024),
      fileUrl: blob.url,
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

    if (attachment.fileUrl) {
      try {
        await del(attachment.fileUrl);
      } catch (blobError) {
        console.error('Error deleting from blob storage:', blobError);
      }
    }

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
