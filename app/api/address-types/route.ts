import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  createAddressTypeMaster,
  getAddressTypeMasters,
  updateAddressTypeMaster,
} from '@/lib/db/queries';

async function requireLetterModule() {
  const session = await auth();
  const modules = (session?.user?.modules as string[]) || [];
  if (!session?.user || !modules.includes('letter-generation')) {
    return null;
  }
  return session;
}

export async function GET(request: NextRequest) {
  try {
    if (!(await requireLetterModule())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const includeInactive =
      request.nextUrl.searchParams.get('includeInactive') === 'true';
    const types = await getAddressTypeMasters({ activeOnly: !includeInactive });
    return NextResponse.json({ types });
  } catch (error) {
    console.error('Error fetching address types:', error);
    return NextResponse.json({ error: 'Failed to fetch address types' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await requireLetterModule())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const code = String(body?.code ?? '').trim();
    const labelEn = String(body?.labelEn ?? '').trim();
    const labelMr = String(body?.labelMr ?? '').trim();
    const sortOrder = Number.isFinite(Number(body?.sortOrder))
      ? Number(body.sortOrder)
      : 0;
    if (!code || !labelEn) {
      return NextResponse.json(
        { error: 'code and labelEn are required' },
        { status: 400 },
      );
    }
    const type = await createAddressTypeMaster({
      code,
      labelEn,
      labelMr,
      isActive: body?.isActive !== false,
      sortOrder,
    });
    return NextResponse.json({ type }, { status: 201 });
  } catch (error) {
    console.error('Error creating address type:', error);
    return NextResponse.json({ error: 'Failed to create address type' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!(await requireLetterModule())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const id = String(body?.id ?? '').trim();
    const code = String(body?.code ?? '').trim();
    const labelEn = String(body?.labelEn ?? '').trim();
    const labelMr = String(body?.labelMr ?? '').trim();
    const sortOrder = Number.isFinite(Number(body?.sortOrder))
      ? Number(body.sortOrder)
      : 0;
    if (!id || !code || !labelEn) {
      return NextResponse.json(
        { error: 'id, code, and labelEn are required' },
        { status: 400 },
      );
    }
    const type = await updateAddressTypeMaster({
      id,
      code,
      labelEn,
      labelMr,
      isActive: body?.isActive !== false,
      sortOrder,
    });
    return NextResponse.json({ type });
  } catch (error) {
    console.error('Error updating address type:', error);
    return NextResponse.json({ error: 'Failed to update address type' }, { status: 500 });
  }
}
