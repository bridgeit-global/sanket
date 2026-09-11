import { type NextRequest, NextResponse } from 'next/server';
import { requireBackOfficeSession } from '@/lib/back-office/auth';
import { getVoterByEpicNumber } from '@/lib/db/queries';
import {
  EciSearchError,
  EPIC_NUMBER_PATTERN,
  isAllowedAssembly,
  searchEciVoterByEpic,
  signAddVoterTicket,
} from '@/lib/eci/national-display';

export async function POST(request: NextRequest) {
  const session = await requireBackOfficeSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      epicNumber?: string;
      captchaId?: string;
      captchaData?: string;
    };

    const epicNumber = body.epicNumber?.trim().toUpperCase() ?? '';
    if (!EPIC_NUMBER_PATTERN.test(epicNumber)) {
      return NextResponse.json(
        { error: 'Enter a valid EPIC number (e.g. ABC1234567)' },
        { status: 400 },
      );
    }
    if (!body.captchaId?.trim() || !body.captchaData?.trim()) {
      return NextResponse.json(
        { error: 'Captcha is required' },
        { status: 400 },
      );
    }

    const existing = await getVoterByEpicNumber(epicNumber);
    const alreadyInMaster = existing.length > 0;

    const voter = await searchEciVoterByEpic({
      epicNumber,
      captchaId: body.captchaId,
      captchaData: body.captchaData,
    });

    const allowed = isAllowedAssembly(voter.acNumber);

    return NextResponse.json({
      alreadyInMaster,
      allowed,
      voter,
      ticket:
        allowed && !alreadyInMaster ? signAddVoterTicket(voter) : null,
    });
  } catch (error) {
    if (error instanceof EciSearchError) {
      const status =
        error.code === 'captcha_failed'
          ? 400
          : error.code === 'not_found'
            ? 404
            : 502;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error('ECI voter search failed', error);
    return NextResponse.json(
      { error: 'Failed to search voter services' },
      { status: 500 },
    );
  }
}
