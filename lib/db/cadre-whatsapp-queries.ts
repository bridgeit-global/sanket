import 'server-only';

import { getTypedSupabaseClient } from '@/lib/supabase/typed-client';
import { throwOnSupabaseError } from '@/lib/db/errors';
import { mapCadreWhatsAppMessageRow } from '@/lib/db/mappers';
import { TABLES } from '@/lib/db/schema';
import type {
  CadreWhatsAppMessage,
  CadreWhatsAppMessageImage,
  CadreWhatsAppMessageStatus,
} from '@/lib/db/schema';

export async function enqueueCadreWhatsAppMessage(input: {
  memberId?: string | null;
  whatsappPhone: string;
  message: string;
  images?: CadreWhatsAppMessageImage[];
  createdBy: string;
}): Promise<CadreWhatsAppMessage> {
  const supabase = getTypedSupabaseClient();
  const { data, error } = await supabase
    .from(TABLES.cadreWhatsAppMessage)
    .insert({
      member_id: input.memberId ?? null,
      whatsapp_phone: input.whatsappPhone.trim(),
      message: input.message.trim(),
      image_urls: input.images ?? [],
      status: 'pending',
      created_by: input.createdBy,
    })
    .select('*')
    .single();
  throwOnSupabaseError(error, 'Failed to enqueue WhatsApp message');
  if (!data) throw new Error('Failed to enqueue WhatsApp message');
  return mapCadreWhatsAppMessageRow(data);
}

export async function getCadreWhatsAppMessages(filters: {
  memberId?: string;
  status?: CadreWhatsAppMessageStatus;
  limit?: number;
}): Promise<CadreWhatsAppMessage[]> {
  const supabase = getTypedSupabaseClient();
  let query = supabase
    .from(TABLES.cadreWhatsAppMessage)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 50);

  if (filters.memberId) {
    query = query.eq('member_id', filters.memberId);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  throwOnSupabaseError(error, 'Failed to load WhatsApp messages');
  return (data ?? []).map(mapCadreWhatsAppMessageRow);
}

export async function getPendingCadreWhatsAppMessages(
  limit = 50,
): Promise<CadreWhatsAppMessage[]> {
  return getCadreWhatsAppMessages({ status: 'pending', limit });
}

export async function updateCadreWhatsAppMessageStatus(
  id: string,
  input: {
    status: 'success' | 'failure';
    errorMessage?: string | null;
  },
): Promise<CadreWhatsAppMessage | null> {
  const supabase = getTypedSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(TABLES.cadreWhatsAppMessage)
    .update({
      status: input.status,
      error_message: input.status === 'failure' ? input.errorMessage?.trim() || null : null,
      processed_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle();
  throwOnSupabaseError(error, 'Failed to update WhatsApp message status');
  return data ? mapCadreWhatsAppMessageRow(data) : null;
}
