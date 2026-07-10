import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  createAddressMaster,
  getAddressMasters,
} from '@/lib/db/queries';
import { isAddressType } from '@/lib/letters/address-types';
import { hasAddressContent } from '@/lib/letters/format-address-master';

function parseAddressBody(body: Record<string, unknown> | null | undefined) {
  const {
    name,
    addressType,
    line1En,
    line1Mr,
    line2En,
    line2Mr,
    cityEn,
    cityMr,
    stateEn,
    stateMr,
    pincode,
    isActive,
    sortOrder,
  } = body ?? {};

  const parts = {
    line1En: String(line1En ?? '').trim(),
    line1Mr: String(line1Mr ?? '').trim(),
    line2En: String(line2En ?? '').trim(),
    line2Mr: String(line2Mr ?? '').trim(),
    cityEn: String(cityEn ?? '').trim(),
    cityMr: String(cityMr ?? '').trim(),
    stateEn: String(stateEn ?? '').trim(),
    stateMr: String(stateMr ?? '').trim(),
    pincode: String(pincode ?? '').trim(),
  };

  return {
    name: String(name ?? '').trim(),
    addressType,
    ...parts,
    isActive: isActive !== false,
    sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
    hasContent: hasAddressContent(parts),
  };
}

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
    const parsed = parseAddressBody(body);

    if (!parsed.name || !parsed.addressType || !parsed.hasContent) {
      return NextResponse.json(
        {
          error:
            'name, addressType, and at least one structured address field in English or Marathi are required',
        },
        { status: 400 },
      );
    }

    if (!isAddressType(parsed.addressType)) {
      return NextResponse.json({ error: 'Invalid address type' }, { status: 400 });
    }

    const address = await createAddressMaster({
      name: parsed.name,
      addressType: parsed.addressType,
      line1En: parsed.line1En,
      line1Mr: parsed.line1Mr,
      line2En: parsed.line2En,
      line2Mr: parsed.line2Mr,
      cityEn: parsed.cityEn,
      cityMr: parsed.cityMr,
      stateEn: parsed.stateEn,
      stateMr: parsed.stateMr,
      pincode: parsed.pincode,
      isActive: parsed.isActive,
      sortOrder: parsed.sortOrder,
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
