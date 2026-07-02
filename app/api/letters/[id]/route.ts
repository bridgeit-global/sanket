import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { deleteLetter } from '@/lib/db/queries';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || !modules.includes('letter-generation')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await deleteLetter(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting letter:', error);
    return NextResponse.json(
      { error: 'Failed to delete letter' },
      { status: 500 },
    );
  }
}

