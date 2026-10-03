import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { isUserAdmin } from '@/lib/db/cadre-queries';
import {
  approveLetter,
  findMatterByLetterId,
  submitLetterForVerification,
} from '@/lib/db/queries';
import type { Letter } from '@/lib/db/schema';
import { notifyPush, sendPushToUsers } from '@/lib/push/send';
import { getAdminRoleUserIds } from '@/lib/push/subscriptions';

async function letterPageUrl(letter: Letter): Promise<string> {
  const params = new URLSearchParams({ letterId: letter.id });
  if (letter.beneficiaryServiceId) {
    params.set('beneficiaryServiceId', letter.beneficiaryServiceId);
  } else {
    const matter = await findMatterByLetterId(letter.id);
    if (matter) params.set('govFollowUpMatterId', matter.id);
  }
  return `/modules/letter-generation?${params.toString()}`;
}

function notifyLetterParties(
  letter: Letter,
  actorUserId: string,
  kind: 'submitted' | 'approved',
) {
  notifyPush(async () => {
    const adminIds = await getAdminRoleUserIds();
    const recipientIds = [
      ...new Set(
        [letter.createdBy, ...adminIds].filter((id): id is string => Boolean(id)),
      ),
    ];
    if (recipientIds.length === 0) return;
    if (recipientIds.length === 1 && recipientIds[0] === actorUserId) return;

    const reference = letter.referenceNo || letter.title;
    await sendPushToUsers(recipientIds, {
      title:
        kind === 'submitted'
          ? 'Letter sent for verification'
          : 'Letter approved',
      body: reference,
      url: await letterPageUrl(letter),
      tag: `letter-${letter.id}-${kind}`,
    });
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || !modules.includes('letter-generation')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body?.action;

    if (action === 'submit') {
      const result = await submitLetterForVerification(id);
      if ('error' in result) {
        if (result.error === 'not_found') {
          return NextResponse.json({ error: 'Letter not found' }, { status: 404 });
        }
        return NextResponse.json(
          { error: 'Only a draft letter can be sent for verification' },
          { status: 409 },
        );
      }
      notifyLetterParties(result.letter, session.user.id, 'submitted');
      return NextResponse.json({ letter: result.letter });
    }

    if (action === 'approve') {
      const admin = await isUserAdmin(session.user.id);
      if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      const result = await approveLetter({
        id,
        approvedBy: session.user.id,
      });
      if ('error' in result) {
        if (result.error === 'not_found') {
          return NextResponse.json({ error: 'Letter not found' }, { status: 404 });
        }
        return NextResponse.json(
          { error: 'Only a letter pending verification can be approved' },
          { status: 409 },
        );
      }
      notifyLetterParties(result.letter, session.user.id, 'approved');
      return NextResponse.json({ letter: result.letter });
    }

    return NextResponse.json(
      { error: 'action must be submit or approve' },
      { status: 400 },
    );
  } catch (error) {
    console.error('Error updating letter verification:', error);
    return NextResponse.json(
      { error: 'Failed to update letter verification' },
      { status: 500 },
    );
  }
}
