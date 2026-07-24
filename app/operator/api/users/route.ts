import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getAllUsersWithPermissions } from '@/lib/db/queries';

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || !modules.includes('operator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await getAllUsersWithPermissions();
    const assignable = users
      .filter(
        (user) =>
          user.permissions.operator === true ||
          user.permissions['back-office'] === true,
      )
      .map((user) => ({
        id: user.id,
        userId: user.userId,
        roleName: user.roleInfo?.name ?? null,
      }));

    return NextResponse.json({ users: assignable });
  } catch (error) {
    console.error('Error fetching assignable users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 },
    );
  }
}
