import { type NextRequest, NextResponse } from 'next/server';
import { requireGovFollowUpAccess } from '@/lib/gov-follow-up/access';
import { listGovFollowUpCadreOfficers } from '@/lib/db/gov-follow-up';

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireGovFollowUpAccess();
    if (error) return error;

    const wardGeoId = request.nextUrl.searchParams.get('wardGeoId')?.trim() ?? '';
    if (!wardGeoId) {
      return NextResponse.json({ error: 'wardGeoId is required' }, { status: 400 });
    }

    const officers = await listGovFollowUpCadreOfficers(wardGeoId);
    return NextResponse.json({ officers });
  } catch (err) {
    console.error('Error loading cadre officers:', err);
    return NextResponse.json(
      { error: 'Failed to load ward members' },
      { status: 500 },
    );
  }
}
