import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { logSirActivity } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || !modules.includes('sir')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { epicNumber, action } = body as {
      epicNumber?: string;
      action?: string;
    };

    if (!epicNumber || typeof epicNumber !== 'string') {
      return NextResponse.json(
        { error: 'epicNumber is required' },
        { status: 400 },
      );
    }
    if (action !== 'download' && action !== 'share') {
      return NextResponse.json(
        { error: "action must be 'download' or 'share'" },
        { status: 400 },
      );
    }

    await logSirActivity(action, epicNumber, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging SIR activity:', error);
    return NextResponse.json(
      { error: 'Failed to log activity' },
      { status: 500 },
    );
  }
}
