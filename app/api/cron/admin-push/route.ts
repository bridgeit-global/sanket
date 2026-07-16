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
  const slot = formatSlotLabel(now);

  try {
    const userIds = await sendPushToSubscribedAdmins({
      title: 'Push test',
      body: `Test notification · ${slot} IST`,
      url: '/modules/profile',
      tag: `admin-cron-${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}-${String(now.getUTCHours()).padStart(2, '0')}${String(Math.floor(now.getUTCMinutes() / 15) * 15).padStart(2, '0')}`,
    });

    return NextResponse.json({
      ok: true,
      target: 'user_id=admin',
      sentTo: userIds.length,
      userIds,
      slot,
    });
  } catch (error) {
    console.error('Admin push cron failed:', error);
    return NextResponse.json(
      { error: 'Failed to send admin push notifications' },
      { status: 500 },
    );
  }
}
