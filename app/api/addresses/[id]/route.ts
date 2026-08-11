import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  deleteAddressMaster,
  getAddressMasterById,
  updateAddressMaster,
} from '@/lib/db/queries';
import { isAddressType } from '@/lib/letters/address-types';
import { hasRequiredAddressFields } from '@/lib/letters/format-address-master';

function parseOptionalIsoDate(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(`${raw}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : raw;
}

function parseAddressBody(body: Record<string, unknown> | null | undefined) {
  const {
    name,
    nameMr,
    addressType,
    positionTitleEn,
    positionTitleMr,
    positionCode,
    typeId,
    addressId,
    positionId,
    line1En,
    line1Mr,
    line2En,
    line2Mr,
    line3En,
    line3Mr,
    cityEn,
    cityMr,
    stateEn,
    stateMr,
    pincode,
    isActive,
    sortOrder,
    startDate,
    endDate,
  } = body ?? {};

  const parts = {
    line1En: String(line1En ?? '').trim(),
    line1Mr: String(line1Mr ?? '').trim(),
    line2En: String(line2En ?? '').trim(),
    line2Mr: String(line2Mr ?? '').trim(),
    line3En: String(line3En ?? '').trim(),
    line3Mr: String(line3Mr ?? '').trim(),
    cityEn: String(cityEn ?? '').trim(),
    cityMr: String(cityMr ?? '').trim(),
    stateEn: String(stateEn ?? '').trim(),
    stateMr: String(stateMr ?? '').trim(),
    pincode: String(pincode ?? '').trim(),
  };

  const resolvedTypeId = String(typeId ?? '').trim() || undefined;
  const resolvedAddressId = String(addressId ?? '').trim() || undefined;
  const resolvedPositionId = String(positionId ?? '').trim() || undefined;
  const hasRequiredFields =
    hasRequiredAddressFields(parts, 'en') || hasRequiredAddressFields(parts, 'mr');
  const hasLinkedMasters = Boolean(
    resolvedTypeId && resolvedAddressId && resolvedPositionId,
  );

  return {
    name: String(name ?? '').trim(),
    nameMr: String(nameMr ?? '').trim(),
    addressType: String(addressType ?? '').trim(),
    positionTitleEn: String(positionTitleEn ?? '').trim(),
    positionTitleMr: String(positionTitleMr ?? '').trim(),
    positionCode: String(positionCode ?? '').trim() || null,
    typeId: resolvedTypeId,
    addressId: resolvedAddressId,
    positionId: resolvedPositionId,
    ...parts,
    isActive: isActive !== false,
    sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
    startDate: parseOptionalIsoDate(startDate),
    endDate: parseOptionalIsoDate(endDate),
    hasRequiredFields,
    hasLinkedMasters,
  };
}

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
    const parsed = parseAddressBody(body);

    if (!parsed.name) {
      return NextResponse.json({ error: 'Holder name is required' }, { status: 400 });
    }

    if (!parsed.hasLinkedMasters && !parsed.hasRequiredFields) {
      return NextResponse.json(
        {
          error:
            'typeId, addressId, and positionId are required (or provide Line 1, City, and a valid 6-digit Pincode)',
        },
        { status: 400 },
      );
    }

    if (
      !parsed.typeId &&
      (!parsed.addressType || !isAddressType(parsed.addressType))
    ) {
      return NextResponse.json({ error: 'Invalid address type' }, { status: 400 });
    }

    if (
      parsed.startDate &&
      parsed.endDate &&
      parsed.startDate > parsed.endDate
    ) {
      return NextResponse.json(
        { error: 'Start date must be on or before end date' },
        { status: 400 },
      );
    }

    const existing = await getAddressMasterById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    const address = await updateAddressMaster({
      id,
      name: parsed.name,
      nameMr: parsed.nameMr,
      addressType: parsed.addressType || existing.addressType,
      positionTitleEn: parsed.positionTitleEn,
      positionTitleMr: parsed.positionTitleMr,
      positionCode: parsed.positionCode,
      typeId: parsed.typeId,
      addressId: parsed.addressId,
      positionId: parsed.positionId,
      // When linking by addressId, omit line fields so update does not fork a block.
      ...(parsed.addressId
        ? {}
        : {
            line1En: parsed.line1En,
            line1Mr: parsed.line1Mr,
            line2En: parsed.line2En,
            line2Mr: parsed.line2Mr,
            line3En: parsed.line3En,
            line3Mr: parsed.line3Mr,
            cityEn: parsed.cityEn,
            cityMr: parsed.cityMr,
            stateEn: parsed.stateEn,
            stateMr: parsed.stateMr,
            pincode: parsed.pincode,
          }),
      isActive: parsed.isActive,
      sortOrder: parsed.sortOrder,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
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
