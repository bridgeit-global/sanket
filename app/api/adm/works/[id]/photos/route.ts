import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { auth } from '@/app/(auth)/auth';
import {
  getAdmWorkById,
  updateAdmWork,
  hasModuleAccess,
} from '@/lib/db/queries';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

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

    const hasAccess = await hasModuleAccess(session.user.id, 'adm');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const work = await getAdmWorkById(id);
    if (!work) {
      return NextResponse.json({ error: 'Work not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const photoType = formData.get('type') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (photoType !== 'before' && photoType !== 'after') {
      return NextResponse.json(
        { error: 'Photo type must be "before" or "after"' },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size should be less than 10MB' },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only image files are allowed (JPEG, PNG, GIF, WebP)' },
        { status: 400 },
      );
    }

    const existingUrl =
      photoType === 'before' ? work.beforePhotoUrl : work.afterPhotoUrl;
    if (existingUrl) {
      try {
        await del(existingUrl);
      } catch {
        // Non-fatal if old blob cannot be deleted
      }
    }

    const filename = `adm/${id}/${photoType}-${Date.now()}-${file.name}`;
    const fileBuffer = await file.arrayBuffer();
    const blob = await put(filename, fileBuffer, {
      access: 'public',
      contentType: file.type,
    });

    const patch =
      photoType === 'before'
        ? { beforePhotoUrl: blob.url, beforePhotoName: file.name }
        : { afterPhotoUrl: blob.url, afterPhotoName: file.name };

    const updated = await updateAdmWork(id, patch);
    return NextResponse.json(updated, { status: 201 });
  } catch (error) {
    console.error('Error uploading ADM photo:', error);
    return NextResponse.json(
      { error: 'Failed to upload photo' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await hasModuleAccess(session.user.id, 'adm');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const work = await getAdmWorkById(id);
    if (!work) {
      return NextResponse.json({ error: 'Work not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const photoType = searchParams.get('type');

    if (photoType !== 'before' && photoType !== 'after') {
      return NextResponse.json(
        { error: 'Photo type must be "before" or "after"' },
        { status: 400 },
      );
    }

    const existingUrl =
      photoType === 'before' ? work.beforePhotoUrl : work.afterPhotoUrl;

    if (existingUrl) {
      try {
        await del(existingUrl);
      } catch {
        // Non-fatal
      }
    }

    const patch =
      photoType === 'before'
        ? { beforePhotoUrl: null, beforePhotoName: null }
        : { afterPhotoUrl: null, afterPhotoName: null };

    const updated = await updateAdmWork(id, patch);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error deleting ADM photo:', error);
    return NextResponse.json(
      { error: 'Failed to delete photo' },
      { status: 500 },
    );
  }
}
