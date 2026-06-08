import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { savePushSubscription } from '@/lib/push/subscriptions';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { endpoint, keys, userAgent } = body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json(
      { error: 'Invalid subscription payload' },
      { status: 400 },
    );
  }

  const subscription = await savePushSubscription({
    userId: session.user.id,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    userAgent: userAgent ?? request.headers.get('user-agent') ?? undefined,
  });

  return NextResponse.json({ success: true, id: subscription.id });
}
