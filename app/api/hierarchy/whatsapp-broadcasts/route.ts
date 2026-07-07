import { type NextRequest, NextResponse } from 'next/server';
import {
  enqueueCadreWhatsAppBroadcast,
  getCadreWhatsAppBroadcasts,
} from '@/lib/db/cadre-whatsapp-queries';
import { getCadreConfig } from '@/lib/db/cadre-queries';
import { requireHierarchyAccess } from '@/lib/hierarchy/auth';
import {
  buildBroadcastTargetLabel,
  isBroadcastTargetEmpty,
  parseBroadcastTarget,
} from '@/lib/hierarchy/broadcast-target';
import type { CadreWhatsAppMessageImage } from '@/lib/db/schema';

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
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 50);

  try {
    const broadcasts = await getCadreWhatsAppBroadcasts(limit);
    return NextResponse.json({ success: true, broadcasts });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load WhatsApp broadcasts';
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
    const target = parseBroadcastTarget(body.target);

    if (!target || isBroadcastTargetEmpty(target)) {
      return NextResponse.json({ error: 'Broadcast target is required' }, { status: 400 });
    }

    if (!message && images.length === 0) {
      return NextResponse.json(
        { error: 'Message text or at least one image is required' },
        { status: 400 },
      );
    }

    const config = await getCadreConfig();
    const targetLabel =
      typeof body.targetLabel === 'string' && body.targetLabel.trim()
        ? body.targetLabel.trim()
        : buildBroadcastTargetLabel(target, config, 'AC 172');

    const broadcast = await enqueueCadreWhatsAppBroadcast({
      target,
      targetLabel,
      message,
      images,
      createdBy: access.userId,
    });

    return NextResponse.json({ success: true, broadcast });
  } catch (error) {
    const errMessage =
      error instanceof Error ? error.message : 'Failed to enqueue WhatsApp broadcast';
    return NextResponse.json({ error: errMessage }, { status: 400 });
  }
}
