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
    houseNumberEn,
    houseNumberMr,
    localityStreetEn,
    localityStreetMr,
    townVillageEn,
    townVillageMr,
    pincode,
    isActive,
    sortOrder,
  } = body ?? {};

  const parts = {
    houseNumberEn: String(houseNumberEn ?? '').trim(),
    houseNumberMr: String(houseNumberMr ?? '').trim(),
    localityStreetEn: String(localityStreetEn ?? '').trim(),
    localityStreetMr: String(localityStreetMr ?? '').trim(),
    townVillageEn: String(townVillageEn ?? '').trim(),
    townVillageMr: String(townVillageMr ?? '').trim(),
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
      houseNumberEn: parsed.houseNumberEn,
      houseNumberMr: parsed.houseNumberMr,
      localityStreetEn: parsed.localityStreetEn,
      localityStreetMr: parsed.localityStreetMr,
      townVillageEn: parsed.townVillageEn,
      townVillageMr: parsed.townVillageMr,
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
