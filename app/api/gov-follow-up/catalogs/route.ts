import { NextResponse } from 'next/server';
import { requireGovFollowUpAccess } from '@/lib/gov-follow-up/access';
import { getGovFollowUpCatalogs } from '@/lib/db/gov-follow-up';

export async function GET() {
  try {
    const { error } = await requireGovFollowUpAccess();
    if (error) return error;
    const catalogs = await getGovFollowUpCatalogs();
    return NextResponse.json(catalogs);
  } catch (err) {
    console.error('Error loading follow-up catalogs:', err);
    return NextResponse.json(
      { error: 'Failed to load catalogs' },
      { status: 500 },
    );
  }
}
