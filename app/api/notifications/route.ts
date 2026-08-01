import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  countUnreadAppNotifications,
  listAppNotificationsForUser,
  markAllAppNotificationsRead,
} from '@/lib/notifications/store';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [notifications, unreadCount] = await Promise.all([
    listAppNotificationsForUser(session.user.id),
    countUnreadAppNotifications(session.user.id),
  ]);

  return NextResponse.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      url: n.url,
      tag: n.tag,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount,
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { all?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (!body.all) {
    return NextResponse.json(
      { error: 'Pass { "all": true } to mark all as read' },
      { status: 400 },
    );
  }

  const updated = await markAllAppNotificationsRead(session.user.id);
  return NextResponse.json({ ok: true, updated });
}
