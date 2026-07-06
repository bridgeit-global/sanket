import { type NextRequest, NextResponse } from 'next/server';

export function requireWhatsAppWorkerAuth(request: NextRequest) {
  const apiKey = process.env.WHATSAPP_WORKER_API_KEY?.trim();
  if (!apiKey) {
    return { error: 'WhatsApp worker is not configured', status: 503 as const };
  }

  const authHeader = request.headers.get('authorization');
  const bearer =
    authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : null;
  const headerKey = request.headers.get('x-api-key')?.trim() ?? null;
  const provided = bearer || headerKey;

  if (!provided || provided !== apiKey) {
    return { error: 'Unauthorized', status: 401 as const };
  }

  return { ok: true as const };
}
