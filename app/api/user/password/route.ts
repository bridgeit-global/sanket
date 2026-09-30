import { compare } from 'bcrypt-ts';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { DUMMY_PASSWORD } from '@/lib/constants';
import { getUserById, updateUserDetails } from '@/lib/db/queries';

const PASSWORD_MIN_LENGTH = 6;

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { currentPassword?: unknown; newPassword?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const currentPassword =
      typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword =
      typeof body.newPassword === 'string' ? body.newPassword : '';

    if (!currentPassword) {
      return NextResponse.json(
        { error: 'Current password is required' },
        { status: 400 },
      );
    }

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` },
        { status: 400 },
      );
    }

    const user = await getUserById(session.user.id);
    if (!user?.password) {
      await compare(currentPassword, DUMMY_PASSWORD);
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 },
      );
    }

    const passwordsMatch = await compare(currentPassword, user.password);
    if (!passwordsMatch) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 },
      );
    }

    await updateUserDetails(session.user.id, { password: newPassword });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      { error: 'Failed to update password' },
      { status: 500 },
    );
  }
}
