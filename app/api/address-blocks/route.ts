import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  createAddressBlockRecord,
  getAddressBlocks,
  updateAddressBlockRecord,
} from '@/lib/db/queries';
import { hasRequiredAddressFields } from '@/lib/letters/format-address-master';

async function requireLetterModule() {
  const session = await auth();
  const modules = (session?.user?.modules as string[]) || [];
  if (!session?.user || !modules.includes('letter-generation')) {
    return null;
  }
  return session;
}

function parseParts(body: Record<string, unknown> | null | undefined) {
  return {
    line1En: String(body?.line1En ?? '').trim(),
    line1Mr: String(body?.line1Mr ?? '').trim(),
    line2En: String(body?.line2En ?? '').trim(),
    line2Mr: String(body?.line2Mr ?? '').trim(),
    line3En: String(body?.line3En ?? '').trim(),
    line3Mr: String(body?.line3Mr ?? '').trim(),
    cityEn: String(body?.cityEn ?? '').trim(),
    cityMr: String(body?.cityMr ?? '').trim(),
    stateEn: String(body?.stateEn ?? '').trim(),
    stateMr: String(body?.stateMr ?? '').trim(),
    pincode: String(body?.pincode ?? '').trim(),
  };
}

export async function GET(request: NextRequest) {
  try {
    if (!(await requireLetterModule())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const includeInactive =
      request.nextUrl.searchParams.get('includeInactive') === 'true';
    const blocks = await getAddressBlocks({ activeOnly: !includeInactive });
    return NextResponse.json({ blocks });
  } catch (error) {
    console.error('Error fetching address blocks:', error);
    return NextResponse.json({ error: 'Failed to fetch address blocks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireLetterModule();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const parts = parseParts(body);
    if (
      !hasRequiredAddressFields(parts, 'en') &&
      !hasRequiredAddressFields(parts, 'mr')
    ) {
      return NextResponse.json(
        { error: 'Line 1, City, and a valid 6-digit Pincode are required' },
        { status: 400 },
      );
    }
    const block = await createAddressBlockRecord({
      ...parts,
      isActive: body?.isActive !== false,
      sortOrder: Number.isFinite(Number(body?.sortOrder))
        ? Number(body.sortOrder)
        : 0,
      createdBy: session.user.id,
    });
    return NextResponse.json({ block }, { status: 201 });
  } catch (error) {
    console.error('Error creating address block:', error);
    return NextResponse.json({ error: 'Failed to create address block' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireLetterModule();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const id = String(body?.id ?? '').trim();
    const parts = parseParts(body);
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    if (
      !hasRequiredAddressFields(parts, 'en') &&
      !hasRequiredAddressFields(parts, 'mr')
    ) {
      return NextResponse.json(
        { error: 'Line 1, City, and a valid 6-digit Pincode are required' },
        { status: 400 },
      );
    }
    const block = await updateAddressBlockRecord({
      id,
      ...parts,
      isActive: body?.isActive !== false,
      sortOrder: Number.isFinite(Number(body?.sortOrder))
        ? Number(body.sortOrder)
        : 0,
      updatedBy: session.user.id,
    });
    return NextResponse.json({ block });
  } catch (error) {
    console.error('Error updating address block:', error);
    return NextResponse.json({ error: 'Failed to update address block' }, { status: 500 });
  }
}
