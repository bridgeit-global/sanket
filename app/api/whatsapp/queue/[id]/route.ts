import { type NextRequest, NextResponse } from 'next/server';
import { updateCadreWhatsAppMessageStatus } from '@/lib/db/cadre-whatsapp-queries';
import { requireWhatsAppWorkerAuth } from '@/lib/whatsapp/worker-auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireWhatsAppWorkerAuth(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const status = body.status;

    if (status !== 'success' && status !== 'failure') {
      return NextResponse.json(
        { error: 'status must be success or failure' },
        { status: 400 },
      );
    }

    const errorMessage =
      typeof body.errorMessage === 'string' ? body.errorMessage : undefined;

    const updated = await updateCadreWhatsAppMessageStatus(id, {
      status,
      errorMessage,
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Message not found or already processed' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, message: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update WhatsApp message';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
