import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { sendPushToSubscribedAdmins } from '@/lib/push/send';
import { isPushConfigured } from '@/lib/push/vapid';

function isAuthorizedCron(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${cronSecret}`;
}

function formatSlotLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: 'Push notifications are not configured' },
      { status: 503 },
    );
  }

  const now = new Date();
  const dateKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  try {
    const userIds = await sendPushToSubscribedAdmins({
      title: 'Cadre birthday reminder',
      body: "Check today's cadre hierarchy birthdays and wish your members.",
      url: '/modules/dashboard',
      tag: `cadre-birthday-${dateKey}`,
    });

    return NextResponse.json({
      ok: true,
      target: 'user_id=admin',
      sentTo: userIds.length,
      userIds,
      slot: formatSlotLabel(now),
    });
  } catch (error) {
    console.error('Admin push cron failed:', error);
    return NextResponse.json(
      { error: 'Failed to send admin push notifications' },
      { status: 500 },
    );
  }
}
