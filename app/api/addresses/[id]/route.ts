import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  deleteAddressMaster,
  getAddressMasterById,
  updateAddressMaster,
} from '@/lib/db/queries';
import { isAddressType } from '@/lib/letters/address-types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || !modules.includes('letter-generation')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const address = await getAddressMasterById(id);
    if (!address) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    return NextResponse.json({ address });
  } catch (error) {
    console.error('Error fetching address:', error);
    return NextResponse.json(
      { error: 'Failed to fetch address' },
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
    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || !modules.includes('letter-generation')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
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

    const existing = await getAddressMasterById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    const address = await updateAddressMaster({
      id,
      name: String(name),
      addressType,
      addressEn: String(addressEn),
      addressMr: String(addressMr),
      isActive: isActive !== false,
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
      updatedBy: session.user.id,
    });

    return NextResponse.json({ address });
  } catch (error) {
    console.error('Error updating address:', error);
    const message =
      error instanceof Error && error.message.includes('duplicate')
        ? 'An address with this name already exists'
        : 'Failed to update address';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || !modules.includes('letter-generation')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await getAddressMasterById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    await deleteAddressMaster(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting address:', error);
    return NextResponse.json(
      { error: 'Failed to delete address' },
      { status: 500 },
    );
  }
}
