import { type NextRequest, NextResponse } from 'next/server';
import {
  enqueueCadreWhatsAppMessage,
  getCadreWhatsAppMessages,
} from '@/lib/db/cadre-whatsapp-queries';
import { getCadreMemberById } from '@/lib/db/cadre-queries';
import { requireHierarchyAccess } from '@/lib/hierarchy/auth';
import type {
  CadreWhatsAppMessageImage,
  CadreWhatsAppMessageStatus,
} from '@/lib/db/schema';

const MESSAGE_STATUSES = new Set<CadreWhatsAppMessageStatus>([
  'pending',
  'success',
  'failure',
]);

function parseImages(body: unknown): CadreWhatsAppMessageImage[] {
  if (!Array.isArray(body)) return [];
  return body
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const url = typeof row.url === 'string' ? row.url.trim() : '';
      const fileName =
        typeof row.fileName === 'string' && row.fileName.trim()
          ? row.fileName.trim()
          : 'image';
      const mimeType =
        typeof row.mimeType === 'string' && row.mimeType.trim()
          ? row.mimeType.trim()
          : 'image/jpeg';
      if (!url) return null;
      return { url, fileName, mimeType };
    })
    .filter((item): item is CadreWhatsAppMessageImage => item !== null);
}

export async function GET(request: NextRequest) {
  const access = await requireHierarchyAccess();
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get('memberId') ?? undefined;
  const statusParam = searchParams.get('status');
  const status =
    statusParam && MESSAGE_STATUSES.has(statusParam as CadreWhatsAppMessageStatus)
      ? (statusParam as CadreWhatsAppMessageStatus)
      : undefined;
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100);

  try {
    const messages = await getCadreWhatsAppMessages({ memberId, status, limit });
    return NextResponse.json({ success: true, messages });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load WhatsApp messages';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await requireHierarchyAccess(true);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await request.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const images = parseImages(body.images);

    if (!message && images.length === 0) {
      return NextResponse.json(
        { error: 'Message text or at least one image is required' },
        { status: 400 },
      );
    }

    let memberId =
      typeof body.memberId === 'string' && body.memberId.trim()
        ? body.memberId.trim()
        : null;
    let whatsappPhone =
      typeof body.whatsappPhone === 'string' ? body.whatsappPhone.trim() : '';

    if (memberId) {
      const member = await getCadreMemberById(memberId);
      if (!member) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }
      whatsappPhone = member.whatsappPhone?.trim() || whatsappPhone;
      if (!whatsappPhone) {
        return NextResponse.json(
          { error: 'Member has no WhatsApp number on file' },
          { status: 400 },
        );
      }
    }

    if (!whatsappPhone) {
      return NextResponse.json(
        { error: 'WhatsApp phone number is required' },
        { status: 400 },
      );
    }

    const queued = await enqueueCadreWhatsAppMessage({
      memberId,
      whatsappPhone,
      message,
      images,
      createdBy: access.userId,
    });

    return NextResponse.json({ success: true, message: queued });
  } catch (error) {
    const errMessage =
      error instanceof Error ? error.message : 'Failed to enqueue WhatsApp message';
    return NextResponse.json({ error: errMessage }, { status: 400 });
  }
}
