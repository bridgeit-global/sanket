import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import {
  getRegisterEntryById,
  getRegisterAttachments,
  createRegisterAttachment,
  deleteRegisterAttachment,
} from '@/lib/db/queries';
import { hasModuleAccess } from '@/lib/db/queries';

// Allowed file types for document uploads
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

// GET - List attachments for a register entry
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

    const entry = await getRegisterEntryById(id);
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // Check module access based on entry type
    const moduleKey = entry.type === 'inward' ? 'inward' : 'outward';
    const hasAccess = await hasModuleAccess(session.user.id, moduleKey);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const attachments = await getRegisterAttachments(id);
    return NextResponse.json(attachments);
  } catch (error) {
    console.error('Error fetching attachments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attachments' },
      { status: 500 },
    );
  }
}

// POST - Upload a new attachment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const entry = await getRegisterEntryById(id);
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // Check module access based on entry type
    const moduleKey = entry.type === 'inward' ? 'inward' : 'outward';
    const hasAccess = await hasModuleAccess(session.user.id, moduleKey);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size should be less than 10MB' },
        { status: 400 },
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed. Accepted: PDF, images, Word, Excel, text files' },
        { status: 400 },
      );
    }

    // Upload to Vercel Blob
    const filename = `register/${id}/${Date.now()}-${file.name}`;
    const fileBuffer = await file.arrayBuffer();

    const blob = await put(filename, fileBuffer, {
      access: 'public',
      contentType: file.type,
    });

    // Save attachment record to database
    const attachment = await createRegisterAttachment({
      entryId: id,
      fileName: file.name,
      fileSizeKb: Math.round(file.size / 1024),
      fileUrl: blob.url,
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error('Error uploading attachment:', error);
    return NextResponse.json(
      { error: 'Failed to upload attachment' },
      { status: 500 },
    );
  }
}

// DELETE - Remove an attachment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const { id: entryId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const entry = await getRegisterEntryById(entryId);
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // Check module access based on entry type
    const moduleKey = entry.type === 'inward' ? 'inward' : 'outward';
    const hasAccess = await hasModuleAccess(session.user.id, moduleKey);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get attachment ID from query params
    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('attachmentId');

    if (!attachmentId) {
      return NextResponse.json(
        { error: 'Attachment ID is required' },
        { status: 400 },
      );
    }

    // Get the attachment to find the blob URL
    const attachments = await getRegisterAttachments(entryId);
    const attachment = attachments.find((a) => a.id === attachmentId);

    if (!attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 },
      );
    }

    // Delete from Vercel Blob if URL exists
    if (attachment.fileUrl) {
      try {
        await del(attachment.fileUrl);
      } catch (blobError) {
        console.error('Error deleting from blob storage:', blobError);
        // Continue with database deletion even if blob deletion fails
      }
    }

    // Delete from database
    await deleteRegisterAttachment(attachmentId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    return NextResponse.json(
      { error: 'Failed to delete attachment' },
      { status: 500 },
    );
  }
}

