import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { auth } from '@/app/(auth)/auth';
import {
  deleteAdmDemandLetter,
  getAdmDemandLetterById,
  hasModuleAccess,
} from '@/lib/db/queries';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await hasModuleAccess(session.user.id, 'adm');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await getAdmDemandLetterById(id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Demand letter not found' },
        { status: 404 },
      );
    }

    if (existing.fileUrl) {
      try {
        await del(existing.fileUrl);
      } catch {
        // non-fatal
      }
    }

    await deleteAdmDemandLetter(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ADM demand letter:', error);
    return NextResponse.json(
      { error: 'Failed to delete demand letter' },
      { status: 500 },
    );
  }
}
