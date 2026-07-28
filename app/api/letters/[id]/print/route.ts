import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  findPrintedLetterDuplicates,
  getBeneficiaryServiceById,
  getLetterById,
  markLetterPrinted,
} from '@/lib/db/queries';

async function requireLetterGenerationAccess() {
  const session = await auth();
  const modules = (session?.user?.modules as string[]) || [];
  if (!session?.user || !modules.includes('letter-generation')) {
    return null;
  }
  return session;
}

function todayInIndia(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Check whether printing this letter would duplicate a prior print for the
 * same voter + beneficiary service on the same calendar day.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireLetterGenerationAccess();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const letter = await getLetterById(id);
    if (!letter) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const onDate = searchParams.get('date') || todayInIndia();
    const voterIdParam = searchParams.get('voterId');

    const beneficiaryServiceId = letter.beneficiaryServiceId;
    if (!beneficiaryServiceId) {
      return NextResponse.json({
        isReprint: Boolean(letter.printedAt),
        alreadyPrinted: Boolean(letter.printedAt),
        printedAt: letter.printedAt,
        voterId: voterIdParam,
        beneficiaryServiceId: null,
        date: onDate,
        duplicates: [],
      });
    }

    let voterId = voterIdParam?.trim() || null;
    if (!voterId) {
      const service = await getBeneficiaryServiceById(beneficiaryServiceId);
      voterId = service?.voterId ?? null;
    }

    const duplicates = await findPrintedLetterDuplicates({
      beneficiaryServiceId,
      voterId,
      onDate,
    });

    const alreadyPrinted = Boolean(letter.printedAt);
    const sameDayDuplicates = duplicates.length > 0;
    const isReprint = alreadyPrinted || sameDayDuplicates;

    const latestPrintedAt =
      duplicates[0]?.printedAt ?? letter.printedAt ?? null;
    const printedDay = latestPrintedAt
      ? new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date(latestPrintedAt))
      : onDate;

    return NextResponse.json({
      isReprint,
      alreadyPrinted,
      printedAt: letter.printedAt,
      voterId,
      beneficiaryServiceId,
      date: printedDay,
      duplicates: duplicates.map((row) => ({
        id: row.id,
        referenceNo: row.referenceNo,
        title: row.title,
        printedAt: row.printedAt,
        isCurrentLetter: row.id === letter.id,
      })),
    });
  } catch (error) {
    console.error('Error checking letter print duplicates:', error);
    return NextResponse.json(
      { error: 'Failed to check letter print status' },
      { status: 500 },
    );
  }
}

/** Mark a letter as printed after a successful print dialog. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireLetterGenerationAccess();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const letter = await getLetterById(id);
    if (!letter) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 });
    }

    const updated = await markLetterPrinted(id);
    return NextResponse.json({ letter: updated });
  } catch (error) {
    console.error('Error marking letter as printed:', error);
    return NextResponse.json(
      { error: 'Failed to mark letter as printed' },
      { status: 500 },
    );
  }
}
