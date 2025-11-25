import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  getAllUsersWithPermissions,
  updateUserModulePermissions,
} from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || (!modules.includes('user-management') && !modules.includes('admin'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await getAllUsersWithPermissions();
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users with permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users with permissions' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || (!modules.includes('user-management') && !modules.includes('admin'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, permissions } = body;

    if (!userId || !permissions || typeof permissions !== 'object') {
      return NextResponse.json(
        { error: 'userId and permissions are required' },
        { status: 400 },
      );
    }

    await updateUserModulePermissions(userId, permissions);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating module permissions:', error);
    return NextResponse.json(
      { error: 'Failed to update module permissions' },
      { status: 500 },
    );
  }
}

