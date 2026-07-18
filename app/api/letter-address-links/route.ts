import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  deleteLetterAddressTypeLink,
  getLetterAddressTypeLinks,
  updateLetterAddressTypeLink,
  upsertLetterAddressTypeLink,
} from '@/lib/db/queries';
import {
  isLetterAddressField,
  isAddressType,
  isLetterType,
} from '@/lib/letters/letter-address-fields';

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

    const letterType = request.nextUrl.searchParams.get('letterType') ?? undefined;
    if (letterType && !isLetterType(letterType)) {
      return NextResponse.json({ error: 'Invalid letter type' }, { status: 400 });
    }

    const links = await getLetterAddressTypeLinks({ letterType });
    return NextResponse.json({ links });
  } catch (error) {
    console.error('Error fetching letter address links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch letter address links' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await requireLetterModule())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const letterType = String(body?.letterType ?? '').trim();
    const addressField = String(body?.addressField ?? '').trim();
    const addressType = String(body?.addressType ?? '').trim();
    const sortOrder = Number.isFinite(Number(body?.sortOrder))
      ? Number(body.sortOrder)
      : 0;

    if (!isLetterType(letterType) || !isLetterAddressField(addressField) || !isAddressType(addressType)) {
      return NextResponse.json(
        { error: 'letterType, addressField, and addressType are required' },
        { status: 400 },
      );
    }

    const link = await upsertLetterAddressTypeLink({
      letterType,
      addressField,
      addressType,
      sortOrder,
    });
    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    console.error('Error creating letter address link:', error);
    return NextResponse.json(
      { error: 'Failed to save letter address link' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!(await requireLetterModule())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const id = String(body?.id ?? '').trim();
    const addressType = String(body?.addressType ?? '').trim();
    const sortOrder = body?.sortOrder;

    if (!id || !isAddressType(addressType)) {
      return NextResponse.json(
        { error: 'id and addressType are required' },
        { status: 400 },
      );
    }

    const link = await updateLetterAddressTypeLink({
      id,
      addressType,
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : undefined,
    });
    return NextResponse.json({ link });
  } catch (error) {
    console.error('Error updating letter address link:', error);
    return NextResponse.json(
      { error: 'Failed to update letter address link' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await requireLetterModule())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get('id')?.trim();
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await deleteLetterAddressTypeLink(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting letter address link:', error);
    return NextResponse.json(
      { error: 'Failed to delete letter address link' },
      { status: 500 },
    );
  }
}
