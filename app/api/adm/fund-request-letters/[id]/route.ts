import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { canAccessFundRequestLetters } from '@/lib/adm/fund-request-letter-access';
import { resolveFundRequestLetterLink } from '@/lib/adm/fund-request-letter';
import {
  deleteAdmFundRequestLetter,
  getAdmFundRecordById,
  getAdmFundRequestLetterById,
  updateAdmFundRequestLetter,
} from '@/lib/db/queries';
import { LETTER_PDF_BUCKET } from '@/lib/letters/pdf-storage';
import { admFundRequestLetterUpdateSchema } from '@/lib/validations';
import { supabase } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await canAccessFundRequestLetters(session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await getAdmFundRequestLetterById(id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Request letter not found' },
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = admFundRequestLetterUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const resolved = resolveFundRequestLetterLink({
      status: parsed.data.status,
      fundRecordId: parsed.data.fundRecordId,
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

    const letter = await updateAdmFundRequestLetter({
      id,
      status: resolved.status,
      fundRecordId: resolved.fundRecordId,
    });
    return NextResponse.json(letter);
  } catch (error) {
    console.error('Error updating ADM fund request letter:', error);
    return NextResponse.json(
      { error: 'Failed to update request letter' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await canAccessFundRequestLetters(session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await getAdmFundRequestLetterById(id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Request letter not found' },
        { status: 404 },
      );
    }

    if (existing.storagePath) {
      const { error: removeError } = await supabase.storage
        .from(LETTER_PDF_BUCKET)
        .remove([existing.storagePath]);
      if (removeError) {
        console.error('Failed to remove request letter PDF:', removeError);
      }
    }

    await deleteAdmFundRequestLetter(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ADM fund request letter:', error);
    return NextResponse.json(
      { error: 'Failed to delete request letter' },
      { status: 500 },
    );
  }
}
