import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getReferenceNosForPrefix, hasModuleAccess } from '@/lib/db/queries';
import {
  formatReference,
  nextSequenceNumber,
  normalizeReferencePrefix,
} from '@/lib/letters/reference-sequence';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [hasLetter, hasOutward] = await Promise.all([
      hasModuleAccess(session.user.id, 'letter-generation'),
      hasModuleAccess(session.user.id, 'outward'),
    ]);
    if (!hasLetter && !hasOutward) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const prefixParam = request.nextUrl.searchParams.get('prefix') ?? '';
    const prefix = normalizeReferencePrefix(prefixParam);
    if (!prefix) {
      return NextResponse.json(
        { error: 'prefix is required' },
        { status: 400 },
      );
    }

    const refs = await getReferenceNosForPrefix(prefix);
    const nextNumber = nextSequenceNumber(refs, prefix);
    const fullReference = formatReference(prefix, nextNumber);

    return NextResponse.json({
      prefix,
      nextNumber,
      fullReference,
    });
  } catch (error) {
    console.error('Error resolving reference sequence:', error);
    return NextResponse.json(
      { error: 'Failed to resolve reference sequence' },
      { status: 500 },
    );
  }
}
