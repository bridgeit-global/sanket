import { type NextRequest, NextResponse } from 'next/server';
import { getPendingCadreWhatsAppMessages } from '@/lib/db/cadre-whatsapp-queries';
import { requireWhatsAppWorkerAuth } from '@/lib/whatsapp/worker-auth';

export async function GET(request: NextRequest) {
  const auth = requireWhatsAppWorkerAuth(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200);

  try {
    const messages = await getPendingCadreWhatsAppMessages(limit);
    return NextResponse.json({ success: true, messages });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load WhatsApp queue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
