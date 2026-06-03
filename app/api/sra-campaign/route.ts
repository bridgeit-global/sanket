import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  createSraCampaignVoter,
  getSraCampaignVoters,
} from '@/lib/db/queries';
import {
  formatSraCampaignValidationError,
  sraCampaignVoterFormSchema,
} from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') ?? undefined;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const entries = await getSraCampaignVoters({ search });
    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Error fetching SRA campaign voters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SRA campaign voters' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json();
    const validation = sraCampaignVoterFormSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error.errors
            .map((e) => formatSraCampaignValidationError(e.message))
            .join(', '),
        },
        { status: 400 },
      );
    }

    const { sraVoterId, name, phoneNumber, description } = validation.data;

    const entry = await createSraCampaignVoter({
      sraVoterId,
      name,
      phoneNumber,
      description,
      createdBy: session?.user?.id ?? null,
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('Error creating SRA campaign voter:', error);
    return NextResponse.json(
      { error: 'Failed to save SRA campaign voter' },
      { status: 500 },
    );
  }
}
