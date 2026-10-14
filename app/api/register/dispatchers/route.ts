import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getRegisterDispatchers } from '@/lib/db/queries-crud';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dispatchers = await getRegisterDispatchers();
    return NextResponse.json(dispatchers);
  } catch (error) {
    console.error('Error fetching register dispatchers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch register dispatchers' },
      { status: 500 },
    );
  }
}
