import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  createAddressMaster,
  getAddressMasters,
} from '@/lib/db/queries';
import { isAddressType } from '@/lib/letters/address-types';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || !modules.includes('letter-generation')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const addressType = request.nextUrl.searchParams.get('addressType');
    const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true';

    if (addressType && !isAddressType(addressType)) {
      return NextResponse.json({ error: 'Invalid address type' }, { status: 400 });
    }

    const addresses = await getAddressMasters({
      addressType: addressType && isAddressType(addressType) ? addressType : undefined,
      activeOnly: !includeInactive,
    });

    return NextResponse.json({ addresses });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch addresses' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || !modules.includes('letter-generation')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, addressType, addressEn, addressMr, isActive, sortOrder } = body ?? {};

    if (!name || !addressType || !addressEn || !addressMr) {
      return NextResponse.json(
        { error: 'name, addressType, addressEn, and addressMr are required' },
        { status: 400 },
      );
    }

    if (!isAddressType(addressType)) {
      return NextResponse.json({ error: 'Invalid address type' }, { status: 400 });
    }

    const address = await createAddressMaster({
      name: String(name),
      addressType,
      addressEn: String(addressEn),
      addressMr: String(addressMr),
      isActive: isActive !== false,
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
      createdBy: session.user.id,
    });

    return NextResponse.json({ address }, { status: 201 });
  } catch (error) {
    console.error('Error creating address:', error);
    const message =
      error instanceof Error && error.message.includes('duplicate')
        ? 'An address with this name already exists'
        : 'Failed to create address';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
