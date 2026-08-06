import { type NextRequest, NextResponse } from 'next/server';
import {
  findOrCreateVisitor,
  createVisitorService,
  listVisitors,
} from '@/lib/db/queries';
import { isValidIndianMobile, normalizeIndianMobileDigits } from '@/lib/indian-mobile';
import { requireVisitorSession } from '@/lib/visitor/auth';

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  try {
    const session = await requireVisitorSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') ?? undefined;
    const name = searchParams.get('name') ?? undefined;
    const mobile = searchParams.get('mobile') ?? searchParams.get('mobileNo') ?? undefined;
    const voterId = searchParams.get('voterId') ?? undefined;
    const token = searchParams.get('token') ?? undefined;
    const serviceName = searchParams.get('serviceName') ?? searchParams.get('service') ?? undefined;
    const status = searchParams.get('status') ?? undefined;
    const createdFromRaw = searchParams.get('createdFrom');
    const createdToRaw = searchParams.get('createdTo');
    const createdFrom =
      createdFromRaw && YMD_RE.test(createdFromRaw.trim()) ? createdFromRaw.trim() : undefined;
    const createdTo =
      createdToRaw && YMD_RE.test(createdToRaw.trim()) ? createdToRaw.trim() : undefined;

    const page = Number(searchParams.get('page') ?? 1);
    const limit = Number(searchParams.get('limit') ?? 10);
    const offsetParam = searchParams.get('offset');
    const offset = offsetParam != null ? Number(offsetParam) : undefined;

    if (page < 1) {
      return NextResponse.json({ error: 'Page must be greater than 0' }, { status: 400 });
    }
    if (limit < 1 || limit > 100) {
      return NextResponse.json({ error: 'Limit must be between 1 and 100' }, { status: 400 });
    }

    const result = await listVisitors({
      search,
      name,
      mobile,
      voterId,
      token,
      serviceName,
      status: status && status !== 'all' ? status : undefined,
      createdFrom,
      createdTo,
      page,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error listing visitors:', error);
    return NextResponse.json({ error: 'Failed to list visitors' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireVisitorSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      mobileNumber,
      voterId,
      serviceName,
      serviceNames,
      programmeId,
      description,
      notes,
    } = body ?? {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!mobileNumber || typeof mobileNumber !== 'string' || !isValidIndianMobile(mobileNumber)) {
      return NextResponse.json(
        { error: 'Enter a valid 10-digit Indian mobile number' },
        { status: 400 },
      );
    }

    const resolvedServiceNames = Array.from(
      new Set(
        [
          ...(Array.isArray(serviceNames) ? serviceNames : []),
          ...(typeof serviceName === 'string' ? [serviceName] : []),
        ]
          .map((s) => (typeof s === 'string' ? s.trim() : ''))
          .filter(Boolean),
      ),
    );

    if (resolvedServiceNames.length === 0) {
      return NextResponse.json(
        { error: 'At least one service is required' },
        { status: 400 },
      );
    }

    const visitor = await findOrCreateVisitor({
      name: name.trim(),
      mobileNumber: normalizeIndianMobileDigits(mobileNumber),
      voterId: typeof voterId === 'string' && voterId.trim() ? voterId.trim().toUpperCase() : null,
      createdBy: session.user.id,
    });

    const programme =
      programmeId != null && programmeId !== '' ? String(programmeId) : null;
    const desc = typeof description === 'string' ? description : null;
    const noteText = typeof notes === 'string' ? notes : null;

    const services = [];
    for (const resolvedName of resolvedServiceNames) {
      const service = await createVisitorService({
        visitorId: visitor.id,
        serviceName: resolvedName,
        programmeId: programme,
        description: desc,
        notes: noteText,
        createdBy: session.user.id,
      });
      services.push(service);
    }

    return NextResponse.json({
      visitor,
      services,
      service: services[0] ?? null,
    });
  } catch (error) {
    console.error('Error creating visitor:', error);
    const message =
      error instanceof Error && error.message
        ? String((error as { cause?: string }).cause || error.message)
        : 'Failed to create visitor';
    return NextResponse.json({ error: message || 'Failed to create visitor' }, { status: 500 });
  }
}
