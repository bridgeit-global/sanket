import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { auth } from '@/app/(auth)/auth';
import {
  getProjectById,
  getProjectGroundMedia,
  createProjectGroundMedia,
  getProjectGroundMediaById,
  deleteProjectGroundMedia,
  hasModuleAccess,
} from '@/lib/db/queries';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await hasModuleAccess(session.user.id, 'projects');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const project = await getProjectById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const media = await getProjectGroundMedia(id);
    return NextResponse.json(media);
  } catch (error) {
    console.error('Error fetching ground media:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ground media' },
      { status: 500 },
    );
  }
}

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

    const hasAccess = await hasModuleAccess(session.user.id, 'projects');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const project = await getProjectById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
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
        { error: 'Only image files are allowed' },
        { status: 400 },
      );
    }

    const existing = await getProjectGroundMedia(id);
    const sameTypeCount = existing.filter((m) => m.photoType === photoType).length;

    const filename = `projects/${id}/ground/${photoType}-${Date.now()}-${file.name}`;
    const blob = await put(filename, await file.arrayBuffer(), {
      access: 'public',
      contentType: file.type,
    });

    const media = await createProjectGroundMedia({
      projectId: id,
      photoType,
      fileUrl: blob.url,
      fileName: file.name,
      sortOrder: sameTypeCount,
    });

    return NextResponse.json(media, { status: 201 });
  } catch (error) {
    console.error('Error uploading ground media:', error);
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
    const { id: projectId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await hasModuleAccess(session.user.id, 'projects');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get('mediaId');
    if (!mediaId) {
      return NextResponse.json({ error: 'mediaId is required' }, { status: 400 });
    }

    const existing = await getProjectGroundMediaById(mediaId);
    if (!existing || existing.projectId !== projectId) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    try {
      await del(existing.fileUrl);
    } catch {
      // non-fatal
    }

    await deleteProjectGroundMedia(mediaId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ground media:', error);
    return NextResponse.json(
      { error: 'Failed to delete photo' },
      { status: 500 },
    );
  }
}
