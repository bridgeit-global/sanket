import { type NextRequest, NextResponse } from 'next/server';
import { previewCadreWhatsAppBroadcast } from '@/lib/db/cadre-whatsapp-queries';
import { getCadreConfig } from '@/lib/db/cadre-queries';
import { requireHierarchyAccess } from '@/lib/hierarchy/auth';
import {
  buildBroadcastTargetLabel,
  isBroadcastTargetEmpty,
  parseBroadcastTarget,
} from '@/lib/hierarchy/broadcast-target';

export async function GET(request: NextRequest) {
  const access = await requireHierarchyAccess();
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const target = parseBroadcastTarget({
    constituencyId: searchParams.get('constituencyId'),
    verticalId: searchParams.get('verticalId'),
    wardGeoId: searchParams.get('wardGeoId'),
    boothNo: searchParams.get('boothNo'),
    positionId: searchParams.get('positionId'),
  });

  if (!target || isBroadcastTargetEmpty(target)) {
    return NextResponse.json({ error: 'Broadcast target is required' }, { status: 400 });
  }

  try {
    const config = await getCadreConfig();
    const preview = await previewCadreWhatsAppBroadcast(target);
    const targetLabel = buildBroadcastTargetLabel(
      target,
      config,
      target.constituencyId ? `AC ${target.constituencyId}` : 'AC 172',
    );

    return NextResponse.json({
      success: true,
      ...preview,
      targetLabel,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to preview WhatsApp broadcast';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
