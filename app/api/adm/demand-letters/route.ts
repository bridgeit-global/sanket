import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  createAdmDemandLetter,
  hasModuleAccess,
  listAdmDemandLetters,
} from '@/lib/db/queries';
import { admDemandLetterSchema } from '@/lib/validations';
import {
  buildAppUploadPath,
  uploadAppFile,
} from '@/lib/storage/app-uploads';

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

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await hasModuleAccess(session.user.id, 'adm');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') ?? undefined;
    const from = searchParams.get('from') ?? undefined;
    const to = searchParams.get('to') ?? undefined;

    if (from && !YMD_RE.test(from)) {
      return NextResponse.json(
        { error: 'from must be yyyy-MM-dd' },
        { status: 400 },
      );
    }
    if (to && !YMD_RE.test(to)) {
      return NextResponse.json(
        { error: 'to must be yyyy-MM-dd' },
        { status: 400 },
      );
    }

    const letters = await listAdmDemandLetters({ title, from, to });
    return NextResponse.json(letters);
  } catch (error) {
    console.error('Error listing ADM demand letters:', error);
    return NextResponse.json(
      { error: 'Failed to list demand letters' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await hasModuleAccess(session.user.id, 'adm');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = String(formData.get('title') ?? '');
    const letterDate = String(formData.get('letterDate') ?? '');

    const parsed = admDemandLetterSchema.safeParse({ title, letterDate });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size should be less than 25MB' },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 },
      );
    }

    const letterId = crypto.randomUUID();
    const path = buildAppUploadPath(
      `adm/demand-letters/${letterId}`,
      file.name,
    );
    const uploaded = await uploadAppFile({
      path,
      body: await file.arrayBuffer(),
      contentType: file.type,
    });

    const letter = await createAdmDemandLetter({
      id: letterId,
      letterDate: parsed.data.letterDate,
      title: parsed.data.title,
      fileName: file.name,
      fileSizeKb: Math.round(file.size / 1024),
      fileUrl: uploaded.url,
      uploadedBy: session.user.id,
    });

    return NextResponse.json(letter, { status: 201 });
  } catch (error) {
    console.error('Error uploading ADM demand letter:', error);
    return NextResponse.json(
      { error: 'Failed to upload demand letter' },
      { status: 500 },
    );
  }
}
