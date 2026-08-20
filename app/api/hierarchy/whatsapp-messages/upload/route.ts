import { type NextRequest, NextResponse } from 'next/server';
import { requireHierarchyAccess } from '@/lib/hierarchy/auth';
import {
  buildAppUploadPath,
  uploadAppFile,
} from '@/lib/storage/app-uploads';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export async function POST(request: NextRequest) {
  const access = await requireHierarchyAccess(true);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Image size should be less than 5MB' },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      return NextResponse.json(
        { error: 'Image type not allowed. Accepted: JPEG, PNG, WebP' },
        { status: 400 },
      );
    }

    const path = buildAppUploadPath('whatsapp-messages', file.name);
    const uploaded = await uploadAppFile({
      path,
      body: await file.arrayBuffer(),
      contentType: file.type,
    });

    return NextResponse.json({
      success: true,
      image: {
        url: uploaded.url,
        fileName: file.name,
        mimeType: file.type,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload image';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
