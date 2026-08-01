import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { markAppNotificationRead } from '@/lib/notifications/store';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const notification = await markAppNotificationRead(session.user.id, id);
  if (!notification) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    notification: {
      id: notification.id,
      title: notification.title,
      body: notification.body,
      url: notification.url,
      tag: notification.tag,
      readAt: notification.readAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
    },
  });
}
