import 'server-only';

import { getTypedSupabaseClient } from '@/lib/supabase/typed-client';
import { throwOnSupabaseError } from '@/lib/db/errors';
import { mapCadreWhatsAppBroadcastRow, mapCadreWhatsAppMessageRow } from '@/lib/db/mappers';
import { getCadreMembersForBroadcast } from '@/lib/db/cadre-queries';
import { TABLES } from '@/lib/db/schema';
import type {
  CadreWhatsAppBroadcast,
  CadreWhatsAppBroadcastTarget,
  CadreWhatsAppBroadcastWithStats,
  CadreWhatsAppMessage,
  CadreWhatsAppMessageImage,
  CadreWhatsAppMessageStatus,
} from '@/lib/db/schema';

export const MAX_BROADCAST_RECIPIENTS = 500;
const BROADCAST_INSERT_BATCH_SIZE = 100;

export async function enqueueCadreWhatsAppMessage(input: {
  memberId?: string | null;
  broadcastId?: string | null;
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
      broadcast_id: input.broadcastId ?? null,
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

export async function previewCadreWhatsAppBroadcast(
  target: CadreWhatsAppBroadcastTarget,
): Promise<{
  recipientCount: number;
  skippedNoWhatsapp: number;
  matchedMemberCount: number;
}> {
  const result = await getCadreMembersForBroadcast(target);
  return {
    recipientCount: result.recipients.length,
    skippedNoWhatsapp: result.skippedNoWhatsapp,
    matchedMemberCount: result.matchedMemberCount,
  };
}

export async function enqueueCadreWhatsAppBroadcast(input: {
  target: CadreWhatsAppBroadcastTarget;
  targetLabel: string;
  message: string;
  images?: CadreWhatsAppMessageImage[];
  createdBy: string;
}): Promise<CadreWhatsAppBroadcast> {
  const { recipients, skippedNoWhatsapp } = await getCadreMembersForBroadcast(
    input.target,
  );

  if (recipients.length === 0) {
    throw new Error('No recipients with WhatsApp numbers match this target');
  }
  if (recipients.length > MAX_BROADCAST_RECIPIENTS) {
    throw new Error(
      `Too many recipients (${recipients.length}). Maximum is ${MAX_BROADCAST_RECIPIENTS}.`,
    );
  }

  const supabase = getTypedSupabaseClient();
  const { data: broadcastRow, error: broadcastError } = await supabase
    .from(TABLES.cadreWhatsAppBroadcast)
    .insert({
      message: input.message.trim(),
      image_urls: input.images ?? [],
      target: input.target,
      target_label: input.targetLabel.trim(),
      recipient_count: recipients.length,
      skipped_no_whatsapp: skippedNoWhatsapp,
      created_by: input.createdBy,
    })
    .select('*')
    .single();
  throwOnSupabaseError(broadcastError, 'Failed to create WhatsApp broadcast');
  if (!broadcastRow) throw new Error('Failed to create WhatsApp broadcast');

  const broadcast = mapCadreWhatsAppBroadcastRow(broadcastRow);
  const messagePayload = {
    broadcast_id: broadcast.id,
    message: input.message.trim(),
    image_urls: input.images ?? [],
    status: 'pending' as const,
    created_by: input.createdBy,
  };

  for (let i = 0; i < recipients.length; i += BROADCAST_INSERT_BATCH_SIZE) {
    const batch = recipients.slice(i, i + BROADCAST_INSERT_BATCH_SIZE);
    const { error: messageError } = await supabase
      .from(TABLES.cadreWhatsAppMessage)
      .insert(
        batch.map((recipient) => ({
          ...messagePayload,
          member_id: recipient.memberId,
          whatsapp_phone: recipient.whatsappPhone,
        })),
      );
    throwOnSupabaseError(messageError, 'Failed to enqueue broadcast messages');
  }

  return broadcast;
}

export async function getCadreWhatsAppBroadcasts(
  limit = 20,
): Promise<CadreWhatsAppBroadcastWithStats[]> {
  const supabase = getTypedSupabaseClient();
  const { data: broadcastRows, error: broadcastError } = await supabase
    .from(TABLES.cadreWhatsAppBroadcast)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  throwOnSupabaseError(broadcastError, 'Failed to load WhatsApp broadcasts');

  const broadcasts = (broadcastRows ?? []).map(mapCadreWhatsAppBroadcastRow);
  if (broadcasts.length === 0) return [];

  const broadcastIds = broadcasts.map((broadcast) => broadcast.id);
  const { data: messageRows, error: messageError } = await supabase
    .from(TABLES.cadreWhatsAppMessage)
    .select('broadcast_id, status')
    .in('broadcast_id', broadcastIds);
  throwOnSupabaseError(messageError, 'Failed to load broadcast message stats');

  const statsByBroadcast = new Map<
    string,
    { pendingCount: number; successCount: number; failureCount: number }
  >();
  for (const row of messageRows ?? []) {
    const broadcastId = String(row.broadcast_id);
    const stats = statsByBroadcast.get(broadcastId) ?? {
      pendingCount: 0,
      successCount: 0,
      failureCount: 0,
    };
    const status = String(row.status) as CadreWhatsAppMessageStatus;
    if (status === 'pending') stats.pendingCount += 1;
    else if (status === 'success') stats.successCount += 1;
    else if (status === 'failure') stats.failureCount += 1;
    statsByBroadcast.set(broadcastId, stats);
  }

  return broadcasts.map((broadcast) => {
    const stats = statsByBroadcast.get(broadcast.id) ?? {
      pendingCount: 0,
      successCount: 0,
      failureCount: 0,
    };
    return { ...broadcast, ...stats };
  });
}
