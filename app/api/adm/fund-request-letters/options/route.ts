import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { canAccessFundRequestLetters } from '@/lib/adm/fund-request-letter-access';
import { listAdmFundLinkOptions } from '@/lib/db/queries';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await canAccessFundRequestLetters(session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const funds = await listAdmFundLinkOptions();
    return NextResponse.json(funds);
  } catch (error) {
    console.error('Error listing ADM fund options:', error);
    return NextResponse.json(
      { error: 'Failed to list ADM funds' },
      { status: 500 },
    );
  }
}
