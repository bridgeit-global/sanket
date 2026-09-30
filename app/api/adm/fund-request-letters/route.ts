import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  isAdmFundRequestLetterStatus,
  resolveFundRequestLetterLink,
} from '@/lib/adm/fund-request-letter';
import { canAccessFundRequestLetters } from '@/lib/adm/fund-request-letter-access';
import {
  beneficiaryServiceExists,
  createAdmFundRequestLetter,
  getAdmFundRecordById,
  listAdmFundRequestLetters,
} from '@/lib/db/queries';
import { LETTER_PDF_BUCKET } from '@/lib/letters/pdf-storage';
import { admFundRequestLetterSchema } from '@/lib/validations';
import { supabase } from '@/lib/supabase/server';

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requestLetterStoragePath(id: string): string {
  return `adm/fund-request-letters/${id}/request-letter.pdf`;
}

function isPdfFile(file: File): boolean {
  if (!file.name.toLowerCase().endsWith('.pdf')) return false;
  return (
    file.type === 'application/pdf' ||
    file.type === 'application/octet-stream' ||
    file.type === ''
  );
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await canAccessFundRequestLetters(session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') ?? undefined;
    const statusParam = searchParams.get('status') ?? '';
    const from = searchParams.get('from') ?? undefined;
    const to = searchParams.get('to') ?? undefined;
    const beneficiaryServiceId =
      searchParams.get('beneficiaryServiceId') ?? '';

    if (beneficiaryServiceId && !UUID_RE.test(beneficiaryServiceId)) {
      return NextResponse.json(
        { error: 'beneficiaryServiceId must be a uuid' },
        { status: 400 },
      );
    }
    const status =
      statusParam && isAdmFundRequestLetterStatus(statusParam)
        ? statusParam
        : undefined;

    if (statusParam && !status) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
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

    const letters = await listAdmFundRequestLetters({
      title,
      status,
      from,
      to,
      beneficiaryServiceId: beneficiaryServiceId || undefined,
    });
    return NextResponse.json(letters);
  } catch (error) {
    console.error('Error listing ADM fund request letters:', error);
    return NextResponse.json(
      { error: 'Failed to list request letters' },
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

    const hasAccess = await canAccessFundRequestLetters(session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const title = String(formData.get('title') ?? '');
    const letterDate = String(formData.get('letterDate') ?? '');
    const statusRaw = String(formData.get('status') ?? 'pending');
    const fundRaw = String(formData.get('fundRecordId') ?? '').trim();
    const serviceRaw = String(formData.get('beneficiaryServiceId') ?? '').trim();

    const parsed = admFundRequestLetterSchema.safeParse({
      title,
      letterDate,
      status: statusRaw || 'pending',
      fundRecordId: fundRaw || null,
      beneficiaryServiceId: serviceRaw || null,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const resolved = resolveFundRequestLetterLink({
      status: parsed.data.status,
      fundRecordId: parsed.data.fundRecordId ?? null,
    });
    if ('error' in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: 400 });
    }

    if (resolved.fundRecordId) {
      const fund = await getAdmFundRecordById(resolved.fundRecordId);
      if (!fund) {
        return NextResponse.json(
          { error: 'ADM fund not found' },
          { status: 400 },
        );
      }
    }

    const beneficiaryServiceId = parsed.data.beneficiaryServiceId ?? null;
    if (beneficiaryServiceId) {
      const exists = await beneficiaryServiceExists(beneficiaryServiceId);
      if (!exists) {
        return NextResponse.json(
          { error: 'Beneficiary service not found' },
          { status: 400 },
        );
      }
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    if (!isPdfFile(file)) {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 },
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size should be less than 25MB' },
        { status: 400 },
      );
    }

    const letterId = crypto.randomUUID();
    const storagePath = requestLetterStoragePath(letterId);
    const { error: uploadError } = await supabase.storage
      .from(LETTER_PDF_BUCKET)
      .upload(storagePath, await file.arrayBuffer(), {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('Failed to upload request letter PDF:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload PDF' },
        { status: 500 },
      );
    }

    try {
      const letter = await createAdmFundRequestLetter({
        id: letterId,
        letterDate: parsed.data.letterDate,
        title: parsed.data.title,
        status: resolved.status,
        fundRecordId: resolved.fundRecordId,
        fileName: file.name,
        fileSizeKb: Math.round(file.size / 1024),
        storagePath,
        uploadedBy: session.user.id,
        beneficiaryServiceId,
      });
      return NextResponse.json(letter, { status: 201 });
    } catch (error) {
      await supabase.storage.from(LETTER_PDF_BUCKET).remove([storagePath]);
      throw error;
    }
  } catch (error) {
    console.error('Error uploading ADM fund request letter:', error);
    return NextResponse.json(
      { error: 'Failed to upload request letter' },
      { status: 500 },
    );
  }
}
