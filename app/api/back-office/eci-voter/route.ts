import { type NextRequest, NextResponse } from 'next/server';
import { requireBackOfficeSession } from '@/lib/back-office/auth';
import { createVoter, getVoterByEpicNumber } from '@/lib/db/queries';
import {
  EciSearchError,
  isAllowedAssembly,
  verifyAddVoterTicket,
} from '@/lib/eci/national-display';

export async function POST(request: NextRequest) {
  const session = await requireBackOfficeSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { ticket?: string };
    if (!body.ticket?.trim()) {
      return NextResponse.json(
        { error: 'Search the voter again before adding' },
        { status: 400 },
      );
    }

    const ticket = verifyAddVoterTicket(body.ticket.trim());
    if (!isAllowedAssembly(ticket.acNumber)) {
      return NextResponse.json(
        {
          error:
            'Only Anushakti Nagar (AC 172) voters can be added to voter master',
        },
        { status: 403 },
      );
    }

    const existing = await getVoterByEpicNumber(ticket.epicNumber);
    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: 'This voter is already in voter master',
          epicNumber: ticket.epicNumber,
        },
        { status: 409 },
      );
    }

    const voter = ticket.voter;
    const created = await createVoter({
      epicNumber: voter.epicNumber,
      fullName: voter.fullName,
      relationType: voter.relationType,
      relationName: voter.relationName,
      age: voter.age,
      gender: voter.gender,
      address: voter.address,
      pincode: voter.pincode,
      localityStreet: voter.localityStreet,
      townVillage: voter.townVillage,
    });

    return NextResponse.json({ voter: created });
  } catch (error) {
    if (error instanceof EciSearchError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Failed to add ECI voter', error);
    return NextResponse.json(
      { error: 'Failed to add voter to voter master' },
      { status: 500 },
    );
  }
}
