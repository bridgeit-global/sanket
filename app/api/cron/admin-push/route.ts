import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getUpcomingCadreBirthdays } from '@/lib/db/dashboard-queries';
import { sendPushToSubscribedAdmins } from '@/lib/push/send';

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

function birthdayReminderBody(count: number): string {
  if (count === 1) {
    return '1 cadre member has a birthday today. Open the dashboard to wish them.';
  }
  return `${count} cadre members have birthdays today. Open the dashboard to wish them.`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const dateKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  try {
    // daysAhead=0 → only today; high limit so the count is not capped at the dashboard list size
    const todaysBirthdays = await getUpcomingCadreBirthdays(0, 10_000);
    const birthdayCount = todaysBirthdays.length;

    if (birthdayCount === 0) {
      return NextResponse.json({
        ok: true,
        target: 'user_id=admin',
        sentTo: 0,
        userIds: [],
        birthdayCount: 0,
        skipped: 'no_birthdays_today',
        slot: formatSlotLabel(now),
      });
    }

    const userIds = await sendPushToSubscribedAdmins({
      title: 'Cadre birthday reminder',
      body: birthdayReminderBody(birthdayCount),
      url: '/modules/dashboard',
      tag: `cadre-birthday-${dateKey}`,
    });

    return NextResponse.json({
      ok: true,
      target: 'user_id=admin',
      sentTo: userIds.length,
      userIds,
      birthdayCount,
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
