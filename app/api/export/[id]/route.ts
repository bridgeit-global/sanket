import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  getExportJobById,
  deleteExportJob,
  hasModuleAccess,
} from '@/lib/db/queries';

// GET - Get status of a specific export job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await hasModuleAccess(session.user.id, 'back-office');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;
    const job = await getExportJobById(id);

    if (!job) {
      return NextResponse.json({ error: 'Export job not found' }, { status: 404 });
    }

    // Ensure user can only access their own export jobs
    if (job.createdBy !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error('Error fetching export job:', error);
    return NextResponse.json(
      { error: 'Failed to fetch export job' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel/delete an export job
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await hasModuleAccess(session.user.id, 'back-office');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;
    const job = await getExportJobById(id);

    if (!job) {
      return NextResponse.json({ error: 'Export job not found' }, { status: 404 });
    }

    // Ensure user can only delete their own export jobs
    if (job.createdBy !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await deleteExportJob(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting export job:', error);
    return NextResponse.json(
      { error: 'Failed to delete export job' },
      { status: 500 }
    );
  }
}
