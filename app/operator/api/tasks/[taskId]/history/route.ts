import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  getBeneficiaryServiceById,
  getBeneficiaryServiceHistory,
  getTaskHistory,
  getVoterTaskById,
} from '@/lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const session = await auth();

    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || !modules.includes('operator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await params;

    const service = await getBeneficiaryServiceById(taskId);
    if (service) {
      const history = await getBeneficiaryServiceHistory(taskId);
      return NextResponse.json({ history, source: 'service' });
    }

    const task = await getVoterTaskById(taskId);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const history = await getTaskHistory(taskId);
    return NextResponse.json({ history, source: 'task' });
  } catch (error) {
    console.error('Error fetching task history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task history' },
      { status: 500 },
    );
  }
}
