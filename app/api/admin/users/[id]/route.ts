import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  deleteUser,
  getRoleById,
  getUserById,
  getUserModulePermissions,
  updateUserDetails,
} from '@/lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const { id } = await params;

    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || !modules.includes('user-management')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRecord = await getUserById(id);
    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const permissions = await getUserModulePermissions(id);

    let roleInfo = null;
    if (userRecord.roleId) {
      roleInfo = await getRoleById(userRecord.roleId);
    }

    return NextResponse.json({
      ...userRecord,
      permissions,
      roleInfo,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const { id } = await params;

    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || !modules.includes('user-management')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, roleId, password } = body;

    const updated = await updateUserDetails(id, { userId, roleId, password });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const { id } = await params;

    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || !modules.includes('user-management')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 },
      );
    }

    await deleteUser(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 },
    );
  }
}
