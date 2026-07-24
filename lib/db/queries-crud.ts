import 'server-only';

import { supabase } from '@/lib/supabase/server';
import { sql as pgSql } from '@/lib/db/postgres';
import { throwOnSupabaseError } from '@/lib/db/errors';
import { TABLES } from './schema';
import {
  mapBeneficiaryServiceRow,
  mapBeneficiaryServiceAttachmentRow,
  mapBoothMasterRow,
  mapChatRow,
  mapCommunityServiceAreaRow,
  mapDailyProgrammeAttachmentRow,
  mapDailyProgrammeRow,
  mapDocumentRow,
  mapElectionMappingRow,
  mapExportJobRow,
  mapLetterMasterRow,
  mapAddressMasterRow,
  mapDocumentTypeMasterRow,
  mapLetterAddressTypeLinkRow,
  mapLetterRow,
  mapMessageRow,
  mapMlaProjectRow,
  mapAdmFundingCategoryRow,
  mapAdmFundRecordRow,
  mapAdmFundAllocationRow,
  mapAdmDocumentRow,
  mapProjectAttachmentRow,
  mapProjectGroundMediaRow,
  mapRegisterAttachmentRow,
  mapRegisterEntryRow,
  mapRoleModulePermissionRow,
  mapRoleRow,
  mapServiceCatalogRow,
  mapStreamRow,
  mapSuggestionRow,
  mapTaskHistoryRow,
  mapUserModulePermissionRow,
  mapUserPartAssignmentRow,
  mapUserRow,
  mapVoteRow,
  mapVoterMasterRow,
  mapVoterMobileNumberRow,
  mapVoterProfileRow,
  mapVoterTaskRow,
  toChatSdkKeys,
  toSnakeCaseKeys,
} from './mappers';
import { generateHashedPassword } from './utils';
import type { VisibilityType } from '@/components/visibility-selector';
import type { ArtifactKind } from '@/components/artifact';
import { ChatSDKError } from '../errors';
import { notifyPush, sendPushToUser } from '@/lib/push/send';
import type {
  BeneficiaryService,
  BeneficiaryServiceAttachment,
  Chat,
  CommunityServiceArea,
  DailyProgramme,
  DailyProgrammeAttachment,
  DBMessage,
  Document,
  ElectionMapping,
  ElectionMaster,
  ExportJob,
  Letter,
  LetterMaster,
  AddressMaster,
  DocumentTypeMaster,
  LetterAddressTypeLink,
  MlaProject,
  AdmAmountUnit,
  AdmFundingCategory,
  AdmFundRecord,
  AdmFundAllocation,
  AdmFundAllocationWithProject,
  AdmDocument,
  AdmFundingCategoryWithFunds,
  AdmFundRecordWithDetails,
  ProjectAttachment,
  ProjectGroundMedia,
  ProjectDocumentKind,
  RegisterAttachment,
  RegisterEntry,
  Role,
  ServiceCatalog,
  Suggestion,
  TaskHistory,
  User,
  VoterMaster,
  VoterProfile,
  VoterTask,
} from './schema';
import { getCurrentElectionId } from './election';
import { supportsVoterMasterCasteColumn } from './raw-queries';
import {
  getBoothWardMap,
  getWardForPart,
} from '@/lib/ai/data/booth-ward-from-election';
import { normalizePartNo } from '@/lib/ai/data/form20-172-2024';

export type ElectionMasterOption = Pick<
  ElectionMaster,
  'electionId' | 'electionType' | 'year' | 'delimitationVersion' | 'constituencyType' | 'constituencyId'
>;

export type VoterWithElectionData = VoterMaster & {
  electionMapping?: ElectionMapping | null;
  wardNo?: string | null;
  boothName?: string | null;
  englishBoothAddress?: string | null;
};

export type MobileNumberWithSortOrder = {
  mobileNumber: string;
  sortOrder: number;
};

function isMissingColumnError(error: unknown, columnName: string): boolean {
  const errorCode =
    typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code?: string }).code
      : undefined;
  if (errorCode === '42703') return true;
  const message = error instanceof Error ? error.message : String(error);
  return message.includes(`column "${columnName}"`) && message.includes('does not exist');
}

function formatDateToString(date: Date | string): string {
  if (typeof date === 'string') return date;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shortProgrammeTokenSegment(programmeUuid: string): string {
  const compact = programmeUuid.replace(/-/g, '');
  return compact.slice(0, 4).toUpperCase();
}

async function generateServiceToken(programmeId?: string | null): Promise<string> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  const datePrefix = `${dd}${mm}${yy}`;

  const trimmedProgrammeId = programmeId?.trim() || '';

  if (trimmedProgrammeId) {
    const shortProg = shortProgrammeTokenSegment(trimmedProgrammeId);
    const [result] = await pgSql`
      SELECT COUNT(*)::int AS count
      FROM "BeneficiaryService"
      WHERE created_at >= ${todayStart}
        AND programme_id = ${trimmedProgrammeId}
    `;
    const nextNumber = (Number(result?.count) || 0) + 1;
    return `${datePrefix}-${shortProg}-${String(nextNumber).padStart(4, '0')}`;
  }

  const [result] = await pgSql`
    SELECT COUNT(*)::int AS count
    FROM "BeneficiaryService"
    WHERE created_at >= ${todayStart}
  `;
  const nextNumber = (Number(result?.count) || 0) + 1;
  return `${datePrefix}-${String(nextNumber).padStart(4, '0')}`;
}

const VOTER_MOBILE_EPIC_BATCH_SIZE = 5000;

// ---------------------------------------------------------------------------
// Chat SDK
// ---------------------------------------------------------------------------

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    const { error } = await supabase.from(TABLES.chat).insert(
      toChatSdkKeys({ id, createdAt: new Date().toISOString(), userId, title, visibility }),
    );
    throwOnSupabaseError(error, 'Failed to save chat');
    return { rowCount: 1 };
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to save chat');
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await supabase.from(TABLES.vote).delete().eq('chatId', id);
    await supabase.from(TABLES.message).delete().eq('chatId', id);
    await supabase.from(TABLES.stream).delete().eq('chatId', id);

    const { data, error } = await supabase
      .from(TABLES.chat)
      .delete()
      .eq('id', id)
      .select('*')
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to delete chat by id');
    return data ? mapChatRow(data) : undefined;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to delete chat by id');
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const fetchChats = async (cursorCreatedAt?: string, direction?: 'after' | 'before') => {
      let query = supabase
        .from(TABLES.chat)
        .select('*')
        .eq('userId', id)
        .order('createdAt', { ascending: false })
        .limit(extendedLimit);

      if (cursorCreatedAt && direction === 'after') {
        query = query.gt('createdAt', cursorCreatedAt);
      } else if (cursorCreatedAt && direction === 'before') {
        query = query.lt('createdAt', cursorCreatedAt);
      }

      const { data, error } = await query;
      throwOnSupabaseError(error, 'Failed to get chats by user id');
      return (data ?? []).map(mapChatRow);
    };

    let filteredChats: Array<Chat> = [];

    if (startingAfter) {
      const { data: selectedChat, error } = await supabase
        .from(TABLES.chat)
        .select('*')
        .eq('id', startingAfter)
        .maybeSingle();
      throwOnSupabaseError(error, 'Failed to get chat for pagination');
      if (!selectedChat) {
        throw new ChatSDKError('not_found:database', `Chat with id ${startingAfter} not found`);
      }
      filteredChats = await fetchChats(selectedChat.createdAt, 'after');
    } else if (endingBefore) {
      const { data: selectedChat, error } = await supabase
        .from(TABLES.chat)
        .select('*')
        .eq('id', endingBefore)
        .maybeSingle();
      throwOnSupabaseError(error, 'Failed to get chat for pagination');
      if (!selectedChat) {
        throw new ChatSDKError('not_found:database', `Chat with id ${endingBefore} not found`);
      }
      filteredChats = await fetchChats(selectedChat.createdAt, 'before');
    } else {
      filteredChats = await fetchChats();
    }

    const hasMore = filteredChats.length > limit;
    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get chats by user id');
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const { data, error } = await supabase.from(TABLES.chat).select('*').eq('id', id).maybeSingle();
    throwOnSupabaseError(error, 'Failed to get chat by id');
    return data ? mapChatRow(data) : undefined;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get chat by id');
  }
}

export async function saveMessages({ messages }: { messages: Array<DBMessage> }) {
  try {
    const rows = messages.map((m) =>
      toChatSdkKeys({
        id: m.id,
        chatId: m.chatId,
        role: m.role,
        parts: m.parts,
        attachments: m.attachments,
        createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
      }),
    );
    const { error } = await supabase.from(TABLES.message).insert(rows);
    throwOnSupabaseError(error, 'Failed to save messages');
    return { rowCount: messages.length };
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to save messages');
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    const { data, error } = await supabase
      .from(TABLES.message)
      .select('*')
      .eq('chatId', id)
      .order('createdAt', { ascending: true });
    throwOnSupabaseError(error, 'Failed to get messages by chat id');
    return (data ?? []).map(mapMessageRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get messages by chat id');
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const { data: existingMessage, error: msgError } = await supabase
      .from(TABLES.message)
      .select('*')
      .eq('id', messageId)
      .eq('chatId', chatId)
      .maybeSingle();
    throwOnSupabaseError(msgError, 'Failed to validate message');

    if (!existingMessage) {
      throw new ChatSDKError('not_found:vote', 'Message not found in this chat');
    }

    const { data: existingVote, error: voteError } = await supabase
      .from(TABLES.vote)
      .select('*')
      .eq('messageId', messageId)
      .eq('chatId', chatId)
      .maybeSingle();
    throwOnSupabaseError(voteError, 'Failed to check existing vote');

    const isUpvoted = type === 'up';

    if (existingVote) {
      const { error } = await supabase
        .from(TABLES.vote)
        .update({ isUpvoted })
        .eq('messageId', messageId)
        .eq('chatId', chatId);
      throwOnSupabaseError(error, 'Failed to update vote');
      return { rowCount: 1 };
    }

    const { error } = await supabase
      .from(TABLES.vote)
      .insert(toChatSdkKeys({ chatId, messageId, isUpvoted }));
    throwOnSupabaseError(error, 'Failed to insert vote');
    return { rowCount: 1 };
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to vote message');
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    const { data, error } = await supabase.from(TABLES.vote).select('*').eq('chatId', id);
    throwOnSupabaseError(error, 'Failed to get votes by chat id');
    return (data ?? []).map(mapVoteRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get votes by chat id');
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    const { data, error } = await supabase
      .from(TABLES.document)
      .insert(toChatSdkKeys({ id, title, kind, content, userId, createdAt: new Date().toISOString() }))
      .select('*');
    throwOnSupabaseError(error, 'Failed to save document');
    return (data ?? []).map(mapDocumentRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to save document');
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const { data, error } = await supabase
      .from(TABLES.document)
      .select('*')
      .eq('id', id)
      .order('createdAt', { ascending: true });
    throwOnSupabaseError(error, 'Failed to get documents by id');
    return (data ?? []).map(mapDocumentRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get documents by id');
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const { data, error } = await supabase
      .from(TABLES.document)
      .select('*')
      .eq('id', id)
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to get document by id');
    return data ? mapDocumentRow(data) : undefined;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get document by id');
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    const ts = timestamp.toISOString();
    await supabase
      .from(TABLES.suggestion)
      .delete()
      .eq('documentId', id)
      .gt('documentCreatedAt', ts);

    const { data, error } = await supabase
      .from(TABLES.document)
      .delete()
      .eq('id', id)
      .gt('createdAt', ts)
      .select('*');
    throwOnSupabaseError(error, 'Failed to delete documents by id after timestamp');
    return (data ?? []).map(mapDocumentRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to delete documents by id after timestamp');
  }
}

export async function saveSuggestions({ suggestions }: { suggestions: Array<Suggestion> }) {
  try {
    const rows = suggestions.map((s) =>
      toChatSdkKeys({
        id: s.id,
        documentId: s.documentId,
        documentCreatedAt:
          s.documentCreatedAt instanceof Date
            ? s.documentCreatedAt.toISOString()
            : s.documentCreatedAt,
        originalText: s.originalText,
        suggestedText: s.suggestedText,
        description: s.description,
        isResolved: s.isResolved,
        userId: s.userId,
        createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
      }),
    );
    const { error } = await supabase.from(TABLES.suggestion).insert(rows);
    throwOnSupabaseError(error, 'Failed to save suggestions');
    return { rowCount: suggestions.length };
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to save suggestions');
  }
}

export async function getSuggestionsByDocumentId({ documentId }: { documentId: string }) {
  try {
    const { data, error } = await supabase
      .from(TABLES.suggestion)
      .select('*')
      .eq('documentId', documentId);
    throwOnSupabaseError(error, 'Failed to get suggestions by document id');
    return (data ?? []).map(mapSuggestionRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get suggestions by document id');
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    const { data, error } = await supabase.from(TABLES.message).select('*').eq('id', id);
    throwOnSupabaseError(error, 'Failed to get message by id');
    return (data ?? []).map(mapMessageRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get message by id');
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const ts = timestamp.toISOString();
    const { data: messagesToDelete, error: fetchError } = await supabase
      .from(TABLES.message)
      .select('id')
      .eq('chatId', chatId)
      .gte('createdAt', ts);
    throwOnSupabaseError(fetchError, 'Failed to find messages to delete');

    const messageIds = (messagesToDelete ?? []).map((m) => m.id);
    if (messageIds.length === 0) return;

    await supabase.from(TABLES.vote).delete().eq('chatId', chatId).in('messageId', messageIds);

    const { error } = await supabase
      .from(TABLES.message)
      .delete()
      .eq('chatId', chatId)
      .in('id', messageIds);
    throwOnSupabaseError(error, 'Failed to delete messages by chat id after timestamp');
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to delete messages by chat id after timestamp');
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    const { error } = await supabase.from(TABLES.chat).update({ visibility }).eq('id', chatId);
    throwOnSupabaseError(error, 'Failed to update chat visibility by id');
    return { rowCount: 1 };
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to update chat visibility by id');
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    const { error } = await supabase
      .from(TABLES.stream)
      .insert(toChatSdkKeys({ id: streamId, chatId, createdAt: new Date().toISOString() }));
    throwOnSupabaseError(error, 'Failed to create stream id');
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to create stream id');
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const { data, error } = await supabase
      .from(TABLES.stream)
      .select('id')
      .eq('chatId', chatId)
      .order('createdAt', { ascending: true });
    throwOnSupabaseError(error, 'Failed to get stream ids by chat id');
    return (data ?? []).map(({ id }) => String(id));
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get stream ids by chat id');
  }
}

// ---------------------------------------------------------------------------
// Elections & voters
// ---------------------------------------------------------------------------

export async function getElectionMasters(): Promise<Array<ElectionMasterOption>> {
  try {
    const rows = await pgSql`
      SELECT election_id, election_type, year, delimitation_version, constituency_type, constituency_id
      FROM "ElectionMaster"
      ORDER BY year DESC, constituency_type ASC, constituency_id ASC, election_id ASC
    `;
    return rows.map((row) => ({
      electionId: String(row.election_id),
      electionType: String(row.election_type),
      year: Number(row.year),
      delimitationVersion: row.delimitation_version != null ? String(row.delimitation_version) : null,
      constituencyType: row.constituency_type as ElectionMasterOption['constituencyType'],
      constituencyId: row.constituency_id != null ? String(row.constituency_id) : null,
    }));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get elections');
  }
}

export async function getVoterByEpicNumber(
  epicNumber: string,
  electionId?: string,
): Promise<Array<VoterMaster>> {
  try {
    const supportsCaste = await supportsVoterMasterCasteColumn();
    const casteSelect = supportsCaste ? pgSql`, caste` : pgSql``;

    let rows;
    try {
      rows = await pgSql`
        SELECT epic_number, full_name, relation_type, relation_name, family_grouping,
               house_number, religion, dob, age, gender, address, locality_street,
               town_village, pincode ${casteSelect}
        FROM "VoterMaster"
        WHERE epic_number = ${epicNumber}
      `;
    } catch (error) {
      if (supportsCaste && isMissingColumnError(error, 'caste')) {
        rows = await pgSql`
          SELECT epic_number, full_name, relation_type, relation_name, family_grouping,
                 house_number, religion, dob, age, gender, address, locality_street,
                 town_village, pincode
          FROM "VoterMaster"
          WHERE epic_number = ${epicNumber}
        `;
      } else {
        throw error;
      }
    }

    return rows.map(mapVoterMasterRow);
  } catch (error) {
    console.error('Error getting voter by EPIC number:', error);
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get voter by EPIC number');
  }
}

export async function getVoterCount(): Promise<number> {
  try {
    const [result] = await pgSql`SELECT COUNT(*)::int AS count FROM "VoterMaster"`;
    return Number(result?.count) || 0;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get voter count');
  }
}

export async function getVotersByFamilyGrouping(
  familyGrouping: string | null,
): Promise<Array<VoterMaster>> {
  try {
    if (!familyGrouping) return [];

    const rows = await pgSql`
      SELECT * FROM "VoterMaster"
      WHERE family_grouping = ${familyGrouping}
      ORDER BY full_name ASC
    `;
    return rows.map(mapVoterMasterRow);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get voters by family grouping');
  }
}

export async function syncVoterMobileNumberTable(
  epicNumber: string,
  mobileNoPrimaryOrList: string | null | string[],
  mobileNoSecondary?: string | null,
  options?: { throwOnError?: boolean },
): Promise<void> {
  try {
    await pgSql`DELETE FROM "VoterMobileNumber" WHERE epic_number = ${epicNumber}`;

    const rawNumbers = Array.isArray(mobileNoPrimaryOrList)
      ? mobileNoPrimaryOrList
      : [mobileNoPrimaryOrList, mobileNoSecondary].filter(Boolean);
    const seen = new Set<string>();
    const normalizedNumbers: string[] = [];
    for (const number of rawNumbers) {
      const trimmed = number?.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      normalizedNumbers.push(trimmed);
      seen.add(trimmed);
    }
    const limitedNumbers = normalizedNumbers.slice(0, 5);

    if (limitedNumbers.length > 0) {
      const now = new Date().toISOString();
      for (let i = 0; i < limitedNumbers.length; i++) {
        await pgSql`
          INSERT INTO "VoterMobileNumber" (epic_number, mobile_number, sort_order, created_at, updated_at)
          VALUES (${epicNumber}, ${limitedNumbers[i]}, ${i + 1}, ${now}, ${now})
        `;
      }
    }
  } catch (error) {
    console.error('Error syncing VoterMobileNumber table:', error);
    if (options?.throwOnError) throw error;
  }
}

export async function updateVoterMobileNumber(
  epicNumber: string,
  mobileNoPrimary?: string,
  mobileNoSecondary?: string,
  updatedBy?: string,
  sourceModule?: string,
): Promise<VoterMaster | null> {
  try {
    const [existingVoter] = await pgSql`
      SELECT * FROM "VoterMaster" WHERE epic_number = ${epicNumber} LIMIT 1
    `;
    if (!existingVoter) return null;

    const currentMobiles = await pgSql`
      SELECT mobile_number, sort_order FROM "VoterMobileNumber"
      WHERE epic_number = ${epicNumber}
      ORDER BY sort_order ASC
    `;
    const oldMobileNoPrimary =
      currentMobiles.find((e) => Number(e.sort_order) === 1)?.mobile_number?.toString() || null;
    const oldMobileNoSecondary =
      currentMobiles.find((e) => Number(e.sort_order) === 2)?.mobile_number?.toString() || null;

    const newMobileNoPrimary = mobileNoPrimary?.trim() || null;
    const newMobileNoSecondary = mobileNoSecondary?.trim() || null;

    const primaryChanged = oldMobileNoPrimary !== newMobileNoPrimary;
    const secondaryChanged = oldMobileNoSecondary !== newMobileNoSecondary;
    if ((primaryChanged || secondaryChanged) && updatedBy && sourceModule) {
      try {
        await pgSql`
          INSERT INTO "PhoneUpdateHistory" (
            epic_number, old_mobile_no_primary, new_mobile_no_primary,
            old_mobile_no_secondary, new_mobile_no_secondary, updated_by, source_module
          ) VALUES (
            ${epicNumber}, ${oldMobileNoPrimary}, ${newMobileNoPrimary},
            ${oldMobileNoSecondary}, ${newMobileNoSecondary}, ${updatedBy}, ${sourceModule}
          )
        `;
      } catch (error) {
        console.error('Error recording phone update history:', error);
      }
    }

    await syncVoterMobileNumberTable(
      epicNumber,
      newMobileNoPrimary,
      newMobileNoSecondary,
      { throwOnError: true },
    );
    return mapVoterMasterRow(existingVoter);
  } catch (error) {
    console.error('Error updating voter mobile number:', error);
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to update voter mobile number');
  }
}

export async function updateVoter(
  epicNumber: string,
  updateData: Partial<
    Pick<
      VoterMaster,
      | 'fullName'
      | 'age'
      | 'dob'
      | 'gender'
      | 'familyGrouping'
      | 'religion'
      | 'caste'
      | 'houseNumber'
      | 'address'
      | 'pincode'
      | 'relationType'
      | 'relationName'
    >
  > & {
    isVoted2024?: boolean;
    mobileNumbers?: string[];
  },
  updatedBy?: string,
  sourceModule?: string,
): Promise<VoterMaster | null> {
  try {
    const supportsCaste = await supportsVoterMasterCasteColumn();
    const isUpdatingPhone = updateData.mobileNumbers !== undefined;

    let oldMobileNoPrimary: string | null = null;
    let oldMobileNoSecondary: string | null = null;

    if (isUpdatingPhone && updatedBy && sourceModule) {
      const currentMobiles = await pgSql`
        SELECT mobile_number, sort_order FROM "VoterMobileNumber" WHERE epic_number = ${epicNumber}
      `;
      oldMobileNoPrimary =
        currentMobiles.find((e) => Number(e.sort_order) === 1)?.mobile_number?.toString() || null;
      oldMobileNoSecondary =
        currentMobiles.find((e) => Number(e.sort_order) === 2)?.mobile_number?.toString() || null;
    }

    const { isVoted2024, mobileNumbers, ...voterMasterData } = updateData;
    const patch: Record<string, unknown> = {};

    if (voterMasterData.fullName !== undefined) patch.full_name = voterMasterData.fullName;
    if (voterMasterData.age !== undefined) patch.age = voterMasterData.age;
    if (voterMasterData.dob !== undefined) patch.dob = voterMasterData.dob;
    if (voterMasterData.gender !== undefined) patch.gender = voterMasterData.gender;
    if (voterMasterData.familyGrouping !== undefined) patch.family_grouping = voterMasterData.familyGrouping;
    if (voterMasterData.religion !== undefined) patch.religion = voterMasterData.religion;
    if (supportsCaste && voterMasterData.caste !== undefined) patch.caste = voterMasterData.caste;
    if (voterMasterData.houseNumber !== undefined) patch.house_number = voterMasterData.houseNumber;
    if (voterMasterData.address !== undefined) patch.address = voterMasterData.address;
    if (voterMasterData.pincode !== undefined) patch.pincode = voterMasterData.pincode;
    if (voterMasterData.relationType !== undefined) patch.relation_type = voterMasterData.relationType;
    if (voterMasterData.relationName !== undefined) patch.relation_name = voterMasterData.relationName;

    let normalizedMobileNumbers: string[] | null = null;
    if (mobileNumbers !== undefined) {
      const seen = new Set<string>();
      normalizedMobileNumbers = [];
      for (const number of mobileNumbers) {
        const trimmed = number?.trim();
        if (!trimmed || seen.has(trimmed)) continue;
        normalizedMobileNumbers.push(trimmed);
        seen.add(trimmed);
      }
      normalizedMobileNumbers = normalizedMobileNumbers.slice(0, 5);
    }

    if (Object.keys(patch).length > 0) {
      const snakePatch = toSnakeCaseKeys(patch);
      try {
        const { error } = await supabase
          .from(TABLES.voterMaster)
          .update(snakePatch)
          .eq('epic_number', epicNumber);
        throwOnSupabaseError(error, 'Failed to update voter');
      } catch (error) {
        if (supportsCaste && 'caste' in patch && isMissingColumnError(error, 'caste')) {
          const { caste: _c, ...withoutCaste } = snakePatch;
          const { error } = await supabase
            .from(TABLES.voterMaster)
            .update(withoutCaste)
            .eq('epic_number', epicNumber);
          throwOnSupabaseError(error, 'Failed to update voter');
        } else {
          throw error;
        }
      }
    }

    if (isVoted2024 !== undefined && isVoted2024 !== null) {
      const currentElectionId = await getCurrentElectionId();
      await markVoterVote(epicNumber, currentElectionId, isVoted2024);
    }

    if (isUpdatingPhone && updatedBy && sourceModule) {
      const newMobileNoPrimary = normalizedMobileNumbers?.[0] ?? null;
      const newMobileNoSecondary = normalizedMobileNumbers?.[1] ?? null;
      const primaryChanged = oldMobileNoPrimary !== newMobileNoPrimary;
      const secondaryChanged = oldMobileNoSecondary !== newMobileNoSecondary;
      if (primaryChanged || secondaryChanged) {
        await pgSql`
          INSERT INTO "PhoneUpdateHistory" (
            epic_number, old_mobile_no_primary, new_mobile_no_primary,
            old_mobile_no_secondary, new_mobile_no_secondary, updated_by, source_module
          ) VALUES (
            ${epicNumber}, ${oldMobileNoPrimary}, ${newMobileNoPrimary},
            ${oldMobileNoSecondary}, ${newMobileNoSecondary}, ${updatedBy}, ${sourceModule}
          )
        `;
      }
    }

    if (isUpdatingPhone) {
      await syncVoterMobileNumberTable(epicNumber, normalizedMobileNumbers ?? []);
    }

    const currentElectionId = await getCurrentElectionId();
    const voters = await getVoterByEpicNumber(epicNumber, currentElectionId);
    return voters[0] ?? null;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to update voter');
  }
}

export async function createVoter(
  voterData: Partial<VoterMaster> & {
    partNo?: string | null;
    srNo?: string | null;
    isVoted2024?: boolean;
    mobileNoPrimary?: string | null;
    mobileNoSecondary?: string | null;
  },
): Promise<VoterMaster> {
  try {
    if (!voterData.epicNumber || !voterData.fullName) {
      throw new ChatSDKError('bad_request:database', 'EPIC Number and Full Name are required');
    }

    const insertRow = toSnakeCaseKeys({
      epicNumber: voterData.epicNumber,
      fullName: voterData.fullName,
      relationType: voterData.relationType || null,
      relationName: voterData.relationName || null,
      familyGrouping: voterData.familyGrouping || null,
      houseNumber: voterData.houseNumber || null,
      religion: voterData.religion || null,
      age: voterData.age || null,
      dob: voterData.dob || null,
      gender: voterData.gender || null,
      address: voterData.address || null,
      pincode: voterData.pincode || null,
    });

    const { data, error } = await supabase
      .from(TABLES.voterMaster)
      .insert(insertRow)
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to create voter');
    const voter = mapVoterMasterRow(data);

    const currentElectionId = await getCurrentElectionId();
    const shouldCreateMapping =
      voterData.partNo || voterData.srNo || voterData.isVoted2024 !== undefined;

    if (shouldCreateMapping) {
      const { error: mapError } = await supabase.from(TABLES.electionMapping).upsert(
        {
          epic_number: voterData.epicNumber,
          election_id: currentElectionId,
          booth_no: voterData.partNo || null,
          sr_no: voterData.srNo || null,
          has_voted: voterData.isVoted2024 ?? false,
        },
        { onConflict: 'epic_number,election_id' },
      );
      throwOnSupabaseError(mapError, 'Failed to create election mapping for voter');
    }

    await syncVoterMobileNumberTable(
      voterData.epicNumber,
      voterData.mobileNoPrimary || null,
      voterData.mobileNoSecondary || null,
    );

    return voter;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to create voter');
  }
}

export async function getVoterMobileNumbersByEpicNumbers(
  epicNumbers: string[],
): Promise<Map<string, MobileNumberWithSortOrder[]>> {
  try {
    if (epicNumbers.length === 0) return new Map();

    const normalizedEpicNumbers = [
      ...new Set(
        epicNumbers
          .map((epicNumber) => epicNumber?.trim())
          .filter((epicNumber): epicNumber is string => Boolean(epicNumber)),
      ),
    ];
    if (normalizedEpicNumbers.length === 0) return new Map();

    const result = new Map<string, MobileNumberWithSortOrder[]>();

    for (let i = 0; i < normalizedEpicNumbers.length; i += VOTER_MOBILE_EPIC_BATCH_SIZE) {
      const epicBatch = normalizedEpicNumbers.slice(i, i + VOTER_MOBILE_EPIC_BATCH_SIZE);
      const rows = await pgSql`
        SELECT epic_number, mobile_number, sort_order
        FROM "VoterMobileNumber"
        WHERE epic_number = ANY(${epicBatch})
        ORDER BY epic_number ASC, sort_order ASC
      `;
      for (const row of rows) {
        const epic = String(row.epic_number);
        const existing = result.get(epic) || [];
        existing.push({
          mobileNumber: String(row.mobile_number),
          sortOrder: Number(row.sort_order),
        });
        result.set(epic, existing);
      }
    }

    return result;
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error);
    console.error('getVoterMobileNumbersByEpicNumbers failed:', error);
    throw new ChatSDKError('bad_request:database', `Failed to get voter mobile numbers: ${cause}`);
  }
}

export async function getVoterElectionMappings(
  epicNumber: string,
  electionId?: string,
): Promise<Array<ElectionMapping>> {
  try {
    let rows;
    if (electionId) {
      rows = await pgSql`
        SELECT * FROM "ElectionMapping"
        WHERE epic_number = ${epicNumber} AND election_id = ${electionId}
        ORDER BY election_id DESC
      `;
    } else {
      rows = await pgSql`
        SELECT * FROM "ElectionMapping"
        WHERE epic_number = ${epicNumber}
        ORDER BY election_id DESC
      `;
    }
    return rows.map(mapElectionMappingRow);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get voter election mappings');
  }
}

export async function markVoterVote(
  epicNumber: string,
  electionId: string,
  hasVoted: boolean,
): Promise<ElectionMapping> {
  try {
    const { data, error } = await supabase
      .from(TABLES.electionMapping)
      .upsert(
        { epic_number: epicNumber, election_id: electionId, has_voted: hasVoted },
        { onConflict: 'epic_number,election_id' },
      )
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to mark voter vote');
    return mapElectionMappingRow(data);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to mark voter vote');
  }
}

export async function bulkMarkVoterVotes(
  votes: Array<{ epicNumber: string; electionId: string; hasVoted: boolean }>,
): Promise<Array<ElectionMapping>> {
  try {
    if (votes.length === 0) return [];

    const rows = votes.map((vote) => ({
      epic_number: vote.epicNumber,
      election_id: vote.electionId,
      has_voted: vote.hasVoted,
    }));

    const { data, error } = await supabase
      .from(TABLES.electionMapping)
      .upsert(rows, { onConflict: 'epic_number,election_id' })
      .select('*');
    throwOnSupabaseError(error, 'Failed to bulk mark voter votes');
    return (data ?? []).map(mapElectionMappingRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to bulk mark voter votes');
  }
}

export async function getBoothsForElection(electionId: string): Promise<
  Array<{
    boothNo: string;
    boothName: string | null;
    boothAddress: string | null;
  }>
> {
  const rows = await pgSql`
    SELECT booth_no, booth_name, booth_address
    FROM "BoothMaster"
    WHERE election_id = ${electionId}
    ORDER BY booth_no ASC
  `;
  return rows.map((row) => ({
    boothNo: String(row.booth_no),
    boothName: row.booth_name != null ? String(row.booth_name) : null,
    boothAddress: row.booth_address != null ? String(row.booth_address) : null,
  }));
}

// ---------------------------------------------------------------------------
// Beneficiary services & voter tasks
// ---------------------------------------------------------------------------

export async function getActiveServiceCatalog(): Promise<Array<ServiceCatalog>> {
  try {
    const { data, error } = await supabase
      .from(TABLES.serviceCatalog)
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    throwOnSupabaseError(error, 'Failed to get service catalog');
    return (data ?? []).map(mapServiceCatalogRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get service catalog');
  }
}

export async function ensureServiceCatalogEntry(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;

  try {
    const { data: existing } = await supabase
      .from(TABLES.serviceCatalog)
      .select('id')
      .eq('name', trimmed)
      .limit(1)
      .maybeSingle();
    if (existing) return;

    const [maxRow] = await pgSql`
      SELECT COALESCE(MAX(sort_order), 0)::int AS max_order FROM "ServiceCatalog"
    `;
    const { error } = await supabase.from(TABLES.serviceCatalog).insert({
      name: trimmed,
      sort_order: Number(maxRow?.max_order ?? 0) + 1,
      is_active: true,
    });
    throwOnSupabaseError(error, 'Failed to add service to catalog');
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to add service to catalog');
  }
}

export async function createBeneficiaryService({
  serviceType,
  serviceName,
  description,
  priority = 'medium',
  requestedBy,
  assignedTo,
  voterId,
  notes,
  programmeId,
}: {
  serviceType: 'individual' | 'community';
  serviceName: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  requestedBy: string;
  assignedTo?: string;
  voterId?: string;
  notes?: string;
  programmeId?: string;
}): Promise<BeneficiaryService> {
  try {
    const trimmedProgramme = programmeId?.trim() || undefined;
    const token = await generateServiceToken(trimmedProgramme);

    if (serviceType === 'individual') {
      await ensureServiceCatalogEntry(serviceName);
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(TABLES.beneficiaryServices)
      .insert(
        toSnakeCaseKeys({
          serviceType,
          serviceName,
          description,
          status: 'pending',
          priority,
          requestedBy,
          assignedTo,
          voterId: serviceType === 'individual' ? voterId : undefined,
          token,
          notes,
          programmeId: trimmedProgramme,
          createdAt: now,
          updatedAt: now,
        }),
      )
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to create beneficiary service');
    return mapBeneficiaryServiceRow(data);
  } catch (error) {
    console.error('Database error in createBeneficiaryService:', error);
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to create beneficiary service');
  }
}

export async function getBeneficiaryServiceById(id: string): Promise<BeneficiaryService | null> {
  try {
    const { data, error } = await supabase
      .from(TABLES.beneficiaryServices)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to get beneficiary service by id');
    return data ? mapBeneficiaryServiceRow(data) : null;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get beneficiary service by id');
  }
}

export async function updateBeneficiaryServiceStatus({
  id,
  status,
  priority,
  notes,
  assignedTo,
}: {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
  assignedTo?: string;
}): Promise<BeneficiaryService | null> {
  try {
    const currentService = await getBeneficiaryServiceById(id);
    if (!currentService) return null;

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (priority) updateData.priority = priority;
    if (notes) updateData.notes = notes;
    if (assignedTo) updateData.assigned_to = assignedTo;
    if (status === 'completed') updateData.completed_at = new Date().toISOString();

    const { data, error } = await supabase
      .from(TABLES.beneficiaryServices)
      .update(updateData)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to update beneficiary service status');

    const updatedService = data ? mapBeneficiaryServiceRow(data) : null;
    if (
      updatedService &&
      currentService.status !== status &&
      updatedService.assignedTo
    ) {
      notifyPush(() =>
        sendPushToUser(updatedService.assignedTo!, {
          title: 'Service status updated',
          body: `${updatedService.serviceName}: ${currentService.status} → ${status}`,
          url: `/modules/operator?serviceId=${updatedService.id}`,
          tag: `service-${updatedService.id}`,
        }),
      );
    }

    return updatedService;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to update beneficiary service status');
  }
}

export async function getBeneficiaryServicesByStatus(
  status?: string,
): Promise<Array<BeneficiaryService>> {
  try {
    let query = supabase.from(TABLES.beneficiaryServices).select('*');
    if (status) query = query.eq('status', status);
    const { data, error } = await query.order('created_at', { ascending: false });
    throwOnSupabaseError(error, 'Failed to get beneficiary services by status');
    return (data ?? []).map(mapBeneficiaryServiceRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get beneficiary services by status');
  }
}

export async function getBeneficiaryServiceAttachments(
  serviceId: string,
): Promise<Array<BeneficiaryServiceAttachment>> {
  try {
    const { data, error } = await supabase
      .from(TABLES.beneficiaryServiceAttachment)
      .select('*')
      .eq('service_id', serviceId)
      .order('created_at', { ascending: true });
    throwOnSupabaseError(error, 'Failed to get beneficiary service attachments');
    return (data ?? []).map(mapBeneficiaryServiceAttachmentRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get beneficiary service attachments',
    );
  }
}

export async function createBeneficiaryServiceAttachment({
  serviceId,
  fileName,
  fileSizeKb,
  fileUrl,
}: {
  serviceId: string;
  fileName: string;
  fileSizeKb: number;
  fileUrl?: string;
}): Promise<BeneficiaryServiceAttachment> {
  try {
    const { data, error } = await supabase
      .from(TABLES.beneficiaryServiceAttachment)
      .insert(
        toSnakeCaseKeys({
          serviceId,
          fileName,
          fileSizeKb,
          fileUrl: fileUrl || null,
          createdAt: new Date().toISOString(),
        }),
      )
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to create beneficiary service attachment');
    return mapBeneficiaryServiceAttachmentRow(data);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create beneficiary service attachment',
    );
  }
}

export async function deleteBeneficiaryServiceAttachment(
  id: string,
): Promise<void> {
  try {
    const { error } = await supabase
      .from(TABLES.beneficiaryServiceAttachment)
      .delete()
      .eq('id', id);
    throwOnSupabaseError(error, 'Failed to delete beneficiary service attachment');
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete beneficiary service attachment',
    );
  }
}

export async function createVoterTask({
  serviceId,
  voterId,
  taskType,
  description,
  priority = 'medium',
  assignedTo,
  notes,
  createdBy,
}: {
  serviceId: string;
  voterId: string;
  taskType: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  notes?: string;
  createdBy?: string;
}): Promise<VoterTask> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(TABLES.voterTasks)
      .insert(
        toSnakeCaseKeys({
          serviceId,
          voterId,
          taskType,
          description,
          status: 'pending',
          priority,
          assignedTo,
          notes,
          createdBy,
          createdAt: now,
          updatedAt: now,
        }),
      )
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to create voter task');
    const task = mapVoterTaskRow(data);

    if (task && assignedTo && createdBy && assignedTo !== createdBy) {
      notifyPush(() =>
        sendPushToUser(assignedTo, {
          title: 'New task assigned',
          body: `You have been assigned: ${taskType}`,
          url: `/modules/operator?taskId=${task.id}`,
          tag: `task-${task.id}`,
        }),
      );
    }

    return task;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to create voter task');
  }
}

export async function getVoterTasksByServiceId(serviceId: string): Promise<Array<VoterTask>> {
  try {
    const { data, error } = await supabase
      .from(TABLES.voterTasks)
      .select('*')
      .eq('service_id', serviceId)
      .order('created_at', { ascending: true });
    throwOnSupabaseError(error, 'Failed to get voter tasks by service id');
    return (data ?? []).map(mapVoterTaskRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get voter tasks by service id');
  }
}

export async function getVoterTasksByVoterId(voterId: string): Promise<Array<VoterTask>> {
  try {
    const { data, error } = await supabase
      .from(TABLES.voterTasks)
      .select('*')
      .eq('voter_id', voterId)
      .order('created_at', { ascending: false });
    throwOnSupabaseError(error, 'Failed to get voter tasks by voter id');
    return (data ?? []).map(mapVoterTaskRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get voter tasks by voter id');
  }
}

export async function getVoterBeneficiaryServices(voterId: string): Promise<{
  individual: Array<BeneficiaryService>;
  community: Array<BeneficiaryService>;
}> {
  try {
    const { data: individualData, error: indError } = await supabase
      .from(TABLES.beneficiaryServices)
      .select('*')
      .eq('voter_id', voterId)
      .eq('service_type', 'individual')
      .order('created_at', { ascending: false });
    throwOnSupabaseError(indError, 'Failed to get individual beneficiary services');

    const communityRows = await pgSql`
      SELECT bs.*
      FROM "VoterTask" vt
      INNER JOIN "BeneficiaryService" bs ON vt.service_id = bs.id
      WHERE vt.voter_id = ${voterId} AND bs.service_type = 'community'
      ORDER BY bs.created_at DESC
    `;

    return {
      individual: (individualData ?? []).map(mapBeneficiaryServiceRow),
      community: communityRows.map(mapBeneficiaryServiceRow),
    };
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get voter beneficiary services');
  }
}

export async function getVoterDailyProgrammeEvents(
  _contactNumbers: string[],
): Promise<Array<DailyProgramme & { visitorName: string }>> {
  return [];
}

export async function getVoterTaskById(id: string): Promise<VoterTask | null> {
  try {
    const { data, error } = await supabase
      .from(TABLES.voterTasks)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to get voter task by id');
    return data ? mapVoterTaskRow(data) : null;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get voter task by id');
  }
}

export async function updateVoterTaskStatus({
  id,
  status,
  priority,
  notes,
  assignedTo,
  performedBy,
  updatedBy,
}: {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
  assignedTo?: string;
  performedBy?: string;
  updatedBy?: string;
}): Promise<VoterTask | null> {
  try {
    const currentTask = await getVoterTaskById(id);
    if (!currentTask) return null;

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (priority) updateData.priority = priority;
    if (notes) updateData.notes = notes;
    if (assignedTo) updateData.assigned_to = assignedTo;
    if (updatedBy) updateData.updated_by = updatedBy;
    if (status === 'completed') updateData.completed_at = new Date().toISOString();

    const { data, error } = await supabase
      .from(TABLES.voterTasks)
      .update(updateData)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to update voter task status');
    const updatedTask = data ? mapVoterTaskRow(data) : null;

    if (performedBy && updatedTask) {
      if (currentTask.status !== status) {
        await createTaskHistoryEntry({
          taskId: id,
          action: 'status_changed',
          oldValue: currentTask.status,
          newValue: status,
          performedBy,
        });
      }
      if (priority && currentTask.priority !== priority) {
        await createTaskHistoryEntry({
          taskId: id,
          action: 'priority_changed',
          oldValue: currentTask.priority,
          newValue: priority,
          performedBy,
        });
      }
      if (notes && notes !== currentTask.notes) {
        await createTaskHistoryEntry({
          taskId: id,
          action: 'note_added',
          newValue: notes,
          performedBy,
        });
      }
      if (assignedTo && assignedTo !== currentTask.assignedTo) {
        await createTaskHistoryEntry({
          taskId: id,
          action: 'assigned',
          oldValue: currentTask.assignedTo || '',
          newValue: assignedTo,
          performedBy,
        });
        if (assignedTo !== performedBy) {
          notifyPush(() =>
            sendPushToUser(assignedTo, {
              title: 'New task assigned',
              body: `You have been assigned: ${currentTask.taskType}`,
              url: `/modules/operator?taskId=${id}`,
              tag: `task-${id}`,
            }),
          );
        }
      }
    }

    return updatedTask;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to update voter task status');
  }
}

export async function createCommunityServiceAreas({
  serviceId,
  areas,
}: {
  serviceId: string;
  areas: Array<{
    boothNo?: string;
    partNo?: string;
    wardNo?: string;
    acNo?: string;
    electionId?: string;
  }>;
}): Promise<Array<CommunityServiceArea>> {
  try {
    const rows = areas.map((area) =>
      toSnakeCaseKeys({
        serviceId,
        boothNo: area.boothNo ?? area.partNo,
        wardNo: area.wardNo,
        acNo: area.acNo,
        electionId: area.electionId,
        createdAt: new Date().toISOString(),
      }),
    );
    const { data, error } = await supabase
      .from(TABLES.communityServiceAreas)
      .insert(rows)
      .select('*');
    throwOnSupabaseError(error, 'Failed to create community service areas');
    return (data ?? []).map(mapCommunityServiceAreaRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to create community service areas');
  }
}

export async function getCommunityServiceAreasByServiceId(
  serviceId: string,
): Promise<Array<CommunityServiceArea>> {
  try {
    const { data, error } = await supabase
      .from(TABLES.communityServiceAreas)
      .select('*')
      .eq('service_id', serviceId)
      .order('created_at', { ascending: true });
    throwOnSupabaseError(error, 'Failed to get community service areas by service id');
    return (data ?? []).map(mapCommunityServiceAreaRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get community service areas by service id');
  }
}

export async function createTaskHistoryEntry({
  taskId,
  action,
  oldValue,
  newValue,
  performedBy,
  notes,
}: {
  taskId: string;
  action: 'created' | 'status_changed' | 'priority_changed' | 'note_added' | 'escalated' | 'assigned';
  oldValue?: string;
  newValue?: string;
  performedBy: string;
  notes?: string;
}): Promise<TaskHistory> {
  try {
    const { data, error } = await supabase
      .from(TABLES.taskHistory)
      .insert(
        toSnakeCaseKeys({
          taskId,
          action,
          oldValue,
          newValue,
          performedBy,
          notes,
          createdAt: new Date().toISOString(),
        }),
      )
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to create task history entry');
    return mapTaskHistoryRow(data);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to create task history entry');
  }
}

export async function getTaskHistory(taskId: string): Promise<Array<TaskHistory>> {
  try {
    const { data, error } = await supabase
      .from(TABLES.taskHistory)
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });
    throwOnSupabaseError(error, 'Failed to get task history');
    return (data ?? []).map(mapTaskHistoryRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get task history');
  }
}

// ---------------------------------------------------------------------------
// Module permissions & users
// ---------------------------------------------------------------------------

export async function getUserModulePermissions(
  userId: string,
): Promise<Record<string, boolean>> {
  try {
    const { data, error } = await supabase
      .from(TABLES.userModulePermissions)
      .select('*')
      .eq('userId', userId);
    throwOnSupabaseError(error, 'Failed to get user module permissions');
    const result: Record<string, boolean> = {};
    for (const perm of data ?? []) {
      const row = mapUserModulePermissionRow(perm);
      result[row.moduleKey] = row.hasAccess;
    }
    return result;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get user module permissions');
  }
}

export async function getAllUsersWithPermissions(): Promise<
  Array<User & { permissions: Record<string, boolean>; roleInfo?: Role | null }>
> {
  try {
    const { data: users, error: usersError } = await supabase
      .from(TABLES.user)
      .select('*')
      .order('user_id', { ascending: true });
    throwOnSupabaseError(usersError, 'Failed to get users');

    const { data: allPermissions, error: permError } = await supabase
      .from(TABLES.userModulePermissions)
      .select('*');
    throwOnSupabaseError(permError, 'Failed to get user permissions');

    const { data: allRoles, error: rolesError } = await supabase.from(TABLES.role).select('*');
    throwOnSupabaseError(rolesError, 'Failed to get roles');
    const rolesById = new Map((allRoles ?? []).map((r) => [String(r.id), mapRoleRow(r)]));

    const { data: allRolePermissions, error: rolePermError } = await supabase
      .from(TABLES.roleModulePermissions)
      .select('*');
    throwOnSupabaseError(rolePermError, 'Failed to get role permissions');

    const rolePermissionsByRoleId: Record<string, Record<string, boolean>> = {};
    for (const perm of allRolePermissions ?? []) {
      const row = mapRoleModulePermissionRow(perm);
      if (!rolePermissionsByRoleId[row.roleId]) rolePermissionsByRoleId[row.roleId] = {};
      rolePermissionsByRoleId[row.roleId][row.moduleKey] = row.hasAccess;
    }

    const permissionsByUser: Record<string, Record<string, boolean>> = {};
    for (const perm of allPermissions ?? []) {
      const row = mapUserModulePermissionRow(perm);
      if (!permissionsByUser[row.userId]) permissionsByUser[row.userId] = {};
      permissionsByUser[row.userId][row.moduleKey] = row.hasAccess;
    }

    return (users ?? []).map((u) => {
      const user = mapUserRow(u);
      const userPermissions: Record<string, boolean> = {};
      if (user.roleId) {
        Object.assign(userPermissions, rolePermissionsByRoleId[user.roleId] || {});
      }
      Object.assign(userPermissions, permissionsByUser[user.id] || {});
      return {
        ...user,
        permissions: userPermissions,
        roleInfo: user.roleId ? rolesById.get(user.roleId) || null : null,
      };
    });
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get all users with permissions');
  }
}

export async function updateUserModulePermissions(
  userId: string,
  permissions: Record<string, boolean>,
): Promise<void> {
  try {
    const { error: deleteError } = await supabase
      .from(TABLES.userModulePermissions)
      .delete()
      .eq('userId', userId);
    throwOnSupabaseError(deleteError, 'Failed to delete user module permissions');

    const now = new Date().toISOString();
    const permissionEntries = Object.entries(permissions).map(([moduleKey, hasAccess]) => ({
      userId,
      module_key: moduleKey,
      has_access: hasAccess,
      created_at: now,
      updated_at: now,
    }));

    if (permissionEntries.length > 0) {
      const { error } = await supabase
        .from(TABLES.userModulePermissions)
        .insert(permissionEntries);
      throwOnSupabaseError(error, 'Failed to insert user module permissions');
    }
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to update user module permissions');
  }
}

export async function hasModuleAccess(userId: string, moduleKey: string): Promise<boolean> {
  try {
    const moduleKeysToCheck =
      moduleKey === 'daily-programme' || moduleKey === 'calendar'
        ? ['daily-programme', 'calendar']
        : moduleKey === 'io-register' ||
            moduleKey === 'inward' ||
            moduleKey === 'outward'
          ? ['io-register', 'inward', 'outward']
          : [moduleKey];

    const { data: userRecord, error: userError } = await supabase
      .from(TABLES.user)
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    throwOnSupabaseError(userError, 'Failed to get user for module access');
    if (!userRecord) return false;

    const user = mapUserRow(userRecord);

    const userPermQuery = supabase
      .from(TABLES.userModulePermissions)
      .select('*')
      .eq('userId', userId)
      .eq('has_access', true);
    const { data: userPermission, error: upError } =
      moduleKeysToCheck.length === 1
        ? await userPermQuery.eq('module_key', moduleKeysToCheck[0]!).limit(1)
        : await userPermQuery.in('module_key', moduleKeysToCheck).limit(1);
    throwOnSupabaseError(upError, 'Failed to check user module access');

    let rolePermission: unknown[] = [];
    if (user.roleId) {
      const rolePermQuery = supabase
        .from(TABLES.roleModulePermissions)
        .select('*')
        .eq('role_id', user.roleId)
        .eq('has_access', true);
      const { data, error } =
        moduleKeysToCheck.length === 1
          ? await rolePermQuery.eq('module_key', moduleKeysToCheck[0]!).limit(1)
          : await rolePermQuery.in('module_key', moduleKeysToCheck).limit(1);
      throwOnSupabaseError(error, 'Failed to check role module access');
      rolePermission = data ?? [];
    }

    return (
      (userPermission?.length ?? 0) > 0 ||
      (rolePermission.length > 0 &&
        mapRoleModulePermissionRow(rolePermission[0] as Record<string, unknown>).hasAccess === true)
    );
  } catch (error) {
    console.error('Error checking module access:', error);
    if (error instanceof Error && error.message.includes('does not exist')) {
      return false;
    }
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      'bad_request:database',
      `Failed to check module access: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

export async function createUserWithPermissions(
  userIdValue: string,
  password: string,
  _roleEnum: never,
  permissions: Record<string, boolean>,
  roleId?: string | null,
): Promise<User> {
  try {
    const hashedPassword = generateHashedPassword(password);
    const now = new Date().toISOString();
    const { data: newUser, error } = await supabase
      .from(TABLES.user)
      .insert({
        user_id: userIdValue,
        password: hashedPassword,
        role_id: roleId || null,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to create user with permissions');
    const user = mapUserRow(newUser);

    if (Object.keys(permissions).length > 0) {
      const permissionEntries = Object.entries(permissions).map(([moduleKey, hasAccess]) => ({
        userId: user.id,
        module_key: moduleKey,
        has_access: hasAccess,
        created_at: now,
        updated_at: now,
      }));
      const { error: permError } = await supabase
        .from(TABLES.userModulePermissions)
        .insert(permissionEntries);
      throwOnSupabaseError(permError, 'Failed to create user permissions');
    }

    return user;
  } catch (error) {
    console.error('Error creating user with permissions:', error);
    if (error instanceof ChatSDKError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new ChatSDKError('bad_request:database', `Failed to create user with permissions: ${errorMessage}`);
  }
}

export async function deleteUser(userId: string): Promise<void> {
  try {
    const { error } = await supabase.from(TABLES.user).delete().eq('id', userId);
    throwOnSupabaseError(error, 'Failed to delete user');
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to delete user');
  }
}

// ---------------------------------------------------------------------------
// Daily programme
// ---------------------------------------------------------------------------

export async function createDailyProgrammeItem({
  date,
  startTime,
  endTime,
  title,
  location,
  remarks,
  programmeType,
  sortOrder,
  startDate,
  endDate,
  createdBy,
}: {
  date: Date | string;
  startTime: string;
  endTime?: string;
  title: string;
  location: string;
  remarks?: string;
  programmeType?: 'CONSTITUENCY' | 'OUTSIDE_CONSTITUENCY';
  sortOrder?: number;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  createdBy: string;
}): Promise<DailyProgramme> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(TABLES.dailyProgramme)
      .insert(
        toSnakeCaseKeys({
          date: formatDateToString(date),
          startTime,
          endTime: endTime || null,
          title,
          location,
          remarks: remarks || null,
          programmeType: programmeType ?? 'CONSTITUENCY',
          sortOrder: sortOrder ?? 1,
          startDate: startDate ? formatDateToString(startDate) : null,
          endDate: endDate ? formatDateToString(endDate) : null,
          createdBy,
          createdAt: now,
          updatedAt: now,
        }),
      )
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to create daily programme item');
    return mapDailyProgrammeRow(data);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to create daily programme item');
  }
}

export async function getDailyProgrammeItemsWithAttachments(
  args: {
    startDate?: Date | string;
    endDate?: Date | string;
    limit?: number;
  } = {},
): Promise<
  Array<
    DailyProgramme & {
      createdByUserId?: string | null;
      updatedByUserId?: string | null;
      attachments: DailyProgrammeAttachment[];
    }
  >
> {
  try {
    const { startDate, endDate, limit = 1000 } = args;
    const filterStart = startDate ? formatDateToString(startDate) : null;
    const filterEnd = endDate ? formatDateToString(endDate) : null;

    const items = await pgSql`
      SELECT dp.*,
        created_by_user.user_id AS created_by_user_id,
        updated_by_user.user_id AS updated_by_user_id
      FROM "DailyProgramme" dp
      LEFT JOIN "User" AS created_by_user ON dp.created_by = created_by_user.id
      LEFT JOIN "User" AS updated_by_user ON dp.updated_by = updated_by_user.id
      WHERE
        (
          dp.start_date IS NOT NULL
          AND dp.end_date IS NOT NULL
          AND dp.start_date < dp.end_date
          AND (${filterStart}::text IS NULL OR dp.end_date >= ${filterStart})
          AND (${filterEnd}::text IS NULL OR dp.start_date <= ${filterEnd})
        )
        OR (
          NOT (
            dp.start_date IS NOT NULL
            AND dp.end_date IS NOT NULL
            AND dp.start_date < dp.end_date
          )
          AND (${filterStart}::text IS NULL OR dp.date >= ${filterStart})
          AND (${filterEnd}::text IS NULL OR dp.date <= ${filterEnd})
        )
      ORDER BY dp.date ASC, dp.start_time ASC, dp.sort_order ASC
      LIMIT ${limit}
    `;

    if (items.length === 0) return [];

    const programmeIds = items.map((i) => String(i.id));
    const attachmentRows = await pgSql`
      SELECT * FROM "DailyProgrammeAttachment"
      WHERE programme_id = ANY(${programmeIds})
      ORDER BY created_at ASC
    `;

    const byProgrammeId = new Map<string, DailyProgrammeAttachment[]>();
    for (const row of attachmentRows) {
      const att = mapDailyProgrammeAttachmentRow(row);
      const list = byProgrammeId.get(att.programmeId) ?? [];
      list.push(att);
      byProgrammeId.set(att.programmeId, list);
    }

    return items.map((row) => {
      const item = mapDailyProgrammeRow(row);
      return {
        ...item,
        createdByUserId: row.created_by_user_id != null ? String(row.created_by_user_id) : null,
        updatedByUserId: row.updated_by_user_id != null ? String(row.updated_by_user_id) : null,
        attachments: byProgrammeId.get(item.id) ?? [],
      };
    });
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get daily programme items with attachments');
  }
}

export async function getDailyProgrammeItemById(id: string): Promise<DailyProgramme | null> {
  try {
    const { data, error } = await supabase
      .from(TABLES.dailyProgramme)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to get daily programme item');
    return data ? mapDailyProgrammeRow(data) : null;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get daily programme item');
  }
}

export async function updateDailyProgrammeItem(
  id: string,
  data: Partial<Omit<DailyProgramme, 'id' | 'createdBy' | 'createdAt'>>,
  updatedBy?: string,
): Promise<DailyProgramme | null> {
  try {
    const updateData: Record<string, unknown> = { ...data };
    if (updateData.date instanceof Date) updateData.date = formatDateToString(updateData.date);
    if (updateData.startDate instanceof Date)
      updateData.startDate = formatDateToString(updateData.startDate);
    if (updateData.endDate instanceof Date)
      updateData.endDate = formatDateToString(updateData.endDate);
    if (updateData.endTime === '') updateData.endTime = null;
    if (updateData.remarks === '') updateData.remarks = null;
    if (updateData.startDate === '') updateData.startDate = null;
    if (updateData.endDate === '') updateData.endDate = null;
    if (updatedBy) updateData.updatedBy = updatedBy;

    const snakePatch = toSnakeCaseKeys({ ...updateData, updatedAt: new Date().toISOString() });
    const { data: updated, error } = await supabase
      .from(TABLES.dailyProgramme)
      .update(snakePatch)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to update daily programme item');
    return updated ? mapDailyProgrammeRow(updated) : null;
  } catch (error) {
    console.error('Database error updating daily programme item:', error);
    if (error instanceof ChatSDKError) throw error;
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new ChatSDKError('bad_request:database', errorMessage);
  }
}

export async function updateDailyProgrammeSortOrders(
  items: Array<{ id: string; sortOrder: number }>,
  updatedBy?: string,
): Promise<void> {
  if (items.length === 0) return;
  try {
    await pgSql.begin(async (sql) => {
      for (const item of items) {
        await sql`
          UPDATE "DailyProgramme"
          SET sort_order = ${item.sortOrder},
              updated_at = ${new Date().toISOString()},
              updated_by = ${updatedBy ?? null}
          WHERE id = ${item.id}
        `;
      }
    });
  } catch (error) {
    console.error('Database error updating daily programme sort order:', error);
    throw new ChatSDKError('bad_request:database', 'Failed to update daily programme sort order');
  }
}

export async function deleteDailyProgrammeItem(id: string): Promise<void> {
  try {
    const { error } = await supabase.from(TABLES.dailyProgramme).delete().eq('id', id);
    throwOnSupabaseError(error, 'Failed to delete daily programme item');
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to delete daily programme item');
  }
}

export async function getDailyProgrammeAttachments(
  programmeId: string,
): Promise<Array<DailyProgrammeAttachment>> {
  try {
    const { data, error } = await supabase
      .from(TABLES.dailyProgrammeAttachment)
      .select('*')
      .eq('programme_id', programmeId)
      .order('created_at', { ascending: true });
    throwOnSupabaseError(error, 'Failed to get daily programme attachments');
    return (data ?? []).map(mapDailyProgrammeAttachmentRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get daily programme attachments');
  }
}

export async function createDailyProgrammeAttachment({
  programmeId,
  fileName,
  fileSizeKb,
  fileUrl,
}: {
  programmeId: string;
  fileName: string;
  fileSizeKb: number;
  fileUrl?: string;
}): Promise<DailyProgrammeAttachment> {
  try {
    const { data, error } = await supabase
      .from(TABLES.dailyProgrammeAttachment)
      .insert(
        toSnakeCaseKeys({
          programmeId,
          fileName,
          fileSizeKb,
          fileUrl: fileUrl || null,
          createdAt: new Date().toISOString(),
        }),
      )
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to create daily programme attachment');
    return mapDailyProgrammeAttachmentRow(data);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to create daily programme attachment');
  }
}

export async function deleteDailyProgrammeAttachment(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from(TABLES.dailyProgrammeAttachment)
      .delete()
      .eq('id', id);
    throwOnSupabaseError(error, 'Failed to delete daily programme attachment');
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to delete daily programme attachment');
  }
}

export async function getDailyProgrammeAttachmentById(
  id: string,
): Promise<DailyProgrammeAttachment | null> {
  try {
    const { data, error } = await supabase
      .from(TABLES.dailyProgrammeAttachment)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to get daily programme attachment');
    return data ? mapDailyProgrammeAttachmentRow(data) : null;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get daily programme attachment');
  }
}

// ---------------------------------------------------------------------------
// Letter masters
// ---------------------------------------------------------------------------

export async function ensureLetterMasterDefaults(
  options: { forceSyncTemplates?: boolean } = {},
): Promise<void> {
  try {
    const {
      getAllDefaultLetterMasters,
      getDefaultTemplateHtml,
      getDefaultTemplateName,
    } = await import('@/lib/letters/default-template-html');
    const { getDefaultLetterPaperSize } = await import('@/lib/letters/paper-size');
    const { isLetterType } = await import('@/lib/letters/templates');
    const defaults = getAllDefaultLetterMasters();
    const forceSyncTemplates = options.forceSyncTemplates === true;

    const { data: existingRows, error: existingError } = await supabase
      .from(TABLES.letterMaster)
      .select('id, name, letter_type, letter_locale, template_html');
    throwOnSupabaseError(existingError, 'Failed to list letter masters');

    const legacyRationIds = (existingRows ?? [])
      .filter((row) => String(row.letter_type) === 'ration')
      .map((row) => row.id);
    if (legacyRationIds.length > 0) {
      const { error: deleteError } = await supabase
        .from(TABLES.letterMaster)
        .delete()
        .in('id', legacyRationIds);
      throwOnSupabaseError(deleteError, 'Failed to remove legacy ration letter masters');
    }

    const canonicalRows = (existingRows ?? []).filter((row) =>
      isLetterType(String(row.letter_type)),
    );

    const existingKeys = new Set(
      canonicalRows.map(
        (row) => `${String(row.letter_type)}:${String(row.letter_locale)}`,
      ),
    );

    const missing = defaults.filter(
      (item) => !existingKeys.has(`${item.letterType}:${item.letterLocale}`),
    );

    const now = new Date().toISOString();

    if (missing.length > 0) {
      const { error } = await supabase.from(TABLES.letterMaster).insert(
        missing.map((item) =>
          toSnakeCaseKeys({
            name: item.name,
            letterType: item.letterType,
            letterLocale: item.letterLocale,
            templateHtml: item.templateHtml,
            paperSize: getDefaultLetterPaperSize(item.letterType),
            createdAt: now,
            updatedAt: now,
          }),
        ),
      );
      throwOnSupabaseError(error, 'Failed to seed letter masters');
    }

    const staleDefaults = canonicalRows.filter((row) => {
      const letterType = String(row.letter_type);
      const letterLocale = String(row.letter_locale);
      const expectedName = getDefaultTemplateName(
        letterType as import('@/lib/letters/templates').LetterType,
        letterLocale as import('@/lib/letters/templates').LetterLocale,
      );
      const expectedHtml = getDefaultTemplateHtml(
        letterType as import('@/lib/letters/templates').LetterType,
        letterLocale as import('@/lib/letters/templates').LetterLocale,
      );
      if (forceSyncTemplates) {
        return row.template_html !== expectedHtml || row.name !== expectedName;
      }
      // Normal seed: only refresh rows that still use the canonical default name.
      return row.name === expectedName && row.template_html !== expectedHtml;
    });

    if (staleDefaults.length === 0) return;

    await Promise.all(
      staleDefaults.map((row) => {
        const letterType = String(row.letter_type) as import('@/lib/letters/templates').LetterType;
        const letterLocale = String(
          row.letter_locale,
        ) as import('@/lib/letters/templates').LetterLocale;
        return supabase
          .from(TABLES.letterMaster)
          .update(
            toSnakeCaseKeys({
              ...(forceSyncTemplates
                ? { name: getDefaultTemplateName(letterType, letterLocale) }
                : {}),
              templateHtml: getDefaultTemplateHtml(letterType, letterLocale),
              updatedAt: now,
            }),
          )
          .eq('id', row.id);
      }),
    );
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    console.error('ensureLetterMasterDefaults failed:', error);
    throw new ChatSDKError('bad_request:database', 'Failed to seed letter masters');
  }
}

export async function getLetterMasters(): Promise<Array<LetterMaster>> {
  try {
    await ensureLetterMasterDefaults();
    const { data, error } = await supabase
      .from(TABLES.letterMaster)
      .select('*')
      .order('letter_type', { ascending: true })
      .order('letter_locale', { ascending: true });
    throwOnSupabaseError(error, 'Failed to get letter masters');
    return (data ?? []).map(mapLetterMasterRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get letter masters');
  }
}

export async function getLetterMasterByTypeAndLocale({
  letterType,
  letterLocale,
}: {
  letterType: string;
  letterLocale: string;
}): Promise<LetterMaster | null> {
  try {
    await ensureLetterMasterDefaults();
    const { data, error } = await supabase
      .from(TABLES.letterMaster)
      .select('*')
      .eq('letter_type', letterType)
      .eq('letter_locale', letterLocale)
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to get letter master');
    return data ? mapLetterMasterRow(data) : null;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get letter master');
  }
}

export async function getLetterMasterById(id: string): Promise<LetterMaster | null> {
  try {
    const { data, error } = await supabase
      .from(TABLES.letterMaster)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to get letter master by id');
    return data ? mapLetterMasterRow(data) : null;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get letter master by id');
  }
}

export async function createLetterMaster({
  name,
  letterType,
  letterLocale,
  templateHtml,
  letterheadUrl,
  letterheadMode,
  paperSize,
  createdBy,
}: {
  name: string;
  letterType: string;
  letterLocale: string;
  templateHtml: string;
  letterheadUrl?: string | null;
  letterheadMode?: 'half' | 'full';
  paperSize?: 'a4' | 'a5' | 'b5';
  createdBy?: string | null;
}): Promise<LetterMaster> {
  try {
    const existing = await getLetterMasterByTypeAndLocale({ letterType, letterLocale });
    if (existing) {
      throw new ChatSDKError(
        'bad_request:database',
        'A template already exists for this letter type and locale',
      );
    }

    const { resolveLetterPaperSize } = await import('@/lib/letters/paper-size');
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(TABLES.letterMaster)
      .insert(
        toSnakeCaseKeys({
          name,
          letterType,
          letterLocale,
          templateHtml,
          letterheadUrl: letterheadUrl ?? null,
          letterheadMode: letterheadMode === 'half' ? 'half' : 'full',
          paperSize: resolveLetterPaperSize(paperSize, letterType),
          createdBy: createdBy || null,
          updatedBy: createdBy || null,
          createdAt: now,
          updatedAt: now,
        }),
      )
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to create letter master');
    return mapLetterMasterRow(data);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to create letter master');
  }
}

export async function updateLetterMaster({
  id,
  name,
  templateHtml,
  letterheadUrl,
  letterheadMode,
  paperSize,
  updatedBy,
}: {
  id: string;
  name: string;
  templateHtml: string;
  letterheadUrl?: string | null;
  letterheadMode?: 'half' | 'full';
  paperSize?: 'a4' | 'a5' | 'b5';
  updatedBy?: string | null;
}): Promise<LetterMaster> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(TABLES.letterMaster)
      .update(
        toSnakeCaseKeys({
          name,
          templateHtml,
          letterheadUrl: letterheadUrl ?? null,
          letterheadMode: letterheadMode === 'half' ? 'half' : 'full',
          paperSize: paperSize === 'a4' || paperSize === 'a5' || paperSize === 'b5'
            ? paperSize
            : undefined,
          updatedBy: updatedBy || null,
          updatedAt: now,
        }),
      )
      .eq('id', id)
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to update letter master');
    return mapLetterMasterRow(data);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to update letter master');
  }
}

// ---------------------------------------------------------------------------
// Address masters
// ---------------------------------------------------------------------------

export async function ensureAddressMasterDefaults(): Promise<void> {
  try {
    const { getDefaultAddressSeeds } = await import('@/lib/letters/default-addresses');
    const defaults = getDefaultAddressSeeds();

    const { data: existingRows, error: existingError } = await supabase
      .from(TABLES.addressMaster)
      .select('name');
    throwOnSupabaseError(existingError, 'Failed to list address masters');

    const existingNames = new Set((existingRows ?? []).map((row) => String(row.name)));
    const missing = defaults.filter((item) => !existingNames.has(item.name));
    if (missing.length === 0) return;

    const now = new Date().toISOString();
    const { error } = await supabase.from(TABLES.addressMaster).insert(
      missing.map((item) =>
        toSnakeCaseKeys({
          name: item.name,
          nameMr: item.nameMr,
          addressType: item.addressType,
          line1En: item.line1En,
          line1Mr: item.line1Mr,
          line2En: item.line2En,
          line2Mr: item.line2Mr,
          line3En: item.line3En,
          line3Mr: item.line3Mr,
          cityEn: item.cityEn,
          cityMr: item.cityMr,
          stateEn: item.stateEn,
          stateMr: item.stateMr,
          pincode: item.pincode,
          sortOrder: item.sortOrder,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }),
      ),
    );
    throwOnSupabaseError(error, 'Failed to seed address masters');
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to seed address masters');
  }
}

export async function getAddressMasters({
  addressType,
  activeOnly = true,
}: {
  addressType?: AddressMaster['addressType'];
  activeOnly?: boolean;
} = {}): Promise<Array<AddressMaster>> {
  try {
    await ensureAddressMasterDefaults();
    let query = supabase
      .from(TABLES.addressMaster)
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (addressType) {
      query = query.eq('address_type', addressType);
    }
    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    throwOnSupabaseError(error, 'Failed to get address masters');
    return (data ?? []).map(mapAddressMasterRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get address masters');
  }
}

export async function getAddressMasterById(id: string): Promise<AddressMaster | null> {
  try {
    const { data, error } = await supabase
      .from(TABLES.addressMaster)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to get address master by id');
    return data ? mapAddressMasterRow(data) : null;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get address master by id');
  }
}

export async function createAddressMaster({
  name,
  nameMr,
  addressType,
  line1En,
  line1Mr,
  line2En,
  line2Mr,
  line3En,
  line3Mr,
  cityEn,
  cityMr,
  stateEn,
  stateMr,
  pincode,
  isActive = true,
  sortOrder = 0,
  createdBy,
}: {
  name: string;
  nameMr?: string;
  addressType: AddressMaster['addressType'];
  line1En?: string;
  line1Mr?: string;
  line2En?: string;
  line2Mr?: string;
  line3En?: string;
  line3Mr?: string;
  cityEn?: string;
  cityMr?: string;
  stateEn?: string;
  stateMr?: string;
  pincode?: string;
  isActive?: boolean;
  sortOrder?: number;
  createdBy?: string | null;
}): Promise<AddressMaster> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(TABLES.addressMaster)
      .insert(
        toSnakeCaseKeys({
          name,
          nameMr: nameMr ?? '',
          addressType,
          line1En: line1En ?? '',
          line1Mr: line1Mr ?? '',
          line2En: line2En ?? '',
          line2Mr: line2Mr ?? '',
          line3En: line3En ?? '',
          line3Mr: line3Mr ?? '',
          cityEn: cityEn ?? '',
          cityMr: cityMr ?? '',
          stateEn: stateEn ?? '',
          stateMr: stateMr ?? '',
          pincode: pincode ?? '',
          isActive,
          sortOrder,
          createdBy: createdBy || null,
          updatedBy: createdBy || null,
          createdAt: now,
          updatedAt: now,
        }),
      )
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to create address master');
    return mapAddressMasterRow(data);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to create address master');
  }
}

export async function updateAddressMaster({
  id,
  name,
  nameMr,
  addressType,
  line1En,
  line1Mr,
  line2En,
  line2Mr,
  line3En,
  line3Mr,
  cityEn,
  cityMr,
  stateEn,
  stateMr,
  pincode,
  isActive,
  sortOrder,
  updatedBy,
}: {
  id: string;
  name: string;
  nameMr?: string;
  addressType: AddressMaster['addressType'];
  line1En?: string;
  line1Mr?: string;
  line2En?: string;
  line2Mr?: string;
  line3En?: string;
  line3Mr?: string;
  cityEn?: string;
  cityMr?: string;
  stateEn?: string;
  stateMr?: string;
  pincode?: string;
  isActive: boolean;
  sortOrder: number;
  updatedBy?: string | null;
}): Promise<AddressMaster> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(TABLES.addressMaster)
      .update(
        toSnakeCaseKeys({
          name,
          nameMr: nameMr ?? '',
          addressType,
          line1En: line1En ?? '',
          line1Mr: line1Mr ?? '',
          line2En: line2En ?? '',
          line2Mr: line2Mr ?? '',
          line3En: line3En ?? '',
          line3Mr: line3Mr ?? '',
          cityEn: cityEn ?? '',
          cityMr: cityMr ?? '',
          stateEn: stateEn ?? '',
          stateMr: stateMr ?? '',
          pincode: pincode ?? '',
          isActive,
          sortOrder,
          updatedBy: updatedBy || null,
          updatedAt: now,
        }),
      )
      .eq('id', id)
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to update address master');
    return mapAddressMasterRow(data);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to update address master');
  }
}

export async function deleteAddressMaster(id: string): Promise<void> {
  try {
    const { error } = await supabase.from(TABLES.addressMaster).delete().eq('id', id);
    throwOnSupabaseError(error, 'Failed to delete address master');
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to delete address master');
  }
}

// ---------------------------------------------------------------------------
// Letter ↔ address-type links (autofill mapping)
// ---------------------------------------------------------------------------

export async function ensureLetterAddressTypeLinkDefaults(): Promise<void> {
  try {
    const { getDefaultLetterAddressTypeLinks } = await import(
      '@/lib/letters/letter-address-fields'
    );
    const defaults = getDefaultLetterAddressTypeLinks();

    const { data: existingRows, error: existingError } = await supabase
      .from(TABLES.letterAddressTypeLink)
      .select('letter_type, address_field');
    throwOnSupabaseError(existingError, 'Failed to list letter address type links');

    const existingKeys = new Set(
      (existingRows ?? []).map(
        (row) => `${String(row.letter_type)}:${String(row.address_field)}`,
      ),
    );
    const missing = defaults.filter(
      (item) => !existingKeys.has(`${item.letterType}:${item.addressField}`),
    );
    if (missing.length === 0) return;

    const now = new Date().toISOString();
    const { error } = await supabase.from(TABLES.letterAddressTypeLink).insert(
      missing.map((item) =>
        toSnakeCaseKeys({
          letterType: item.letterType,
          addressField: item.addressField,
          addressType: item.addressType,
          sortOrder: item.sortOrder,
          createdAt: now,
          updatedAt: now,
        }),
      ),
    );
    throwOnSupabaseError(error, 'Failed to seed letter address type links');
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to seed letter address type links',
    );
  }
}

export async function getLetterAddressTypeLinks({
  letterType,
}: {
  letterType?: string;
} = {}): Promise<Array<LetterAddressTypeLink>> {
  try {
    await ensureLetterAddressTypeLinkDefaults();
    let query = supabase
      .from(TABLES.letterAddressTypeLink)
      .select('*')
      .order('letter_type', { ascending: true })
      .order('sort_order', { ascending: true });

    if (letterType) {
      query = query.eq('letter_type', letterType);
    }

    const { data, error } = await query;
    throwOnSupabaseError(error, 'Failed to get letter address type links');
    return (data ?? []).map(mapLetterAddressTypeLinkRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get letter address type links',
    );
  }
}

export async function upsertLetterAddressTypeLink({
  letterType,
  addressField,
  addressType,
  sortOrder = 0,
}: {
  letterType: string;
  addressField: string;
  addressType: LetterAddressTypeLink['addressType'];
  sortOrder?: number;
}): Promise<LetterAddressTypeLink> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(TABLES.letterAddressTypeLink)
      .upsert(
        toSnakeCaseKeys({
          letterType,
          addressField,
          addressType,
          sortOrder,
          updatedAt: now,
          createdAt: now,
        }),
        { onConflict: 'letter_type,address_field' },
      )
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to upsert letter address type link');
    return mapLetterAddressTypeLinkRow(data);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to upsert letter address type link',
    );
  }
}

export async function updateLetterAddressTypeLink({
  id,
  addressType,
  sortOrder,
}: {
  id: string;
  addressType: LetterAddressTypeLink['addressType'];
  sortOrder?: number;
}): Promise<LetterAddressTypeLink> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(TABLES.letterAddressTypeLink)
      .update(
        toSnakeCaseKeys({
          addressType,
          ...(sortOrder !== undefined ? { sortOrder } : {}),
          updatedAt: now,
        }),
      )
      .eq('id', id)
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to update letter address type link');
    return mapLetterAddressTypeLinkRow(data);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update letter address type link',
    );
  }
}

export async function deleteLetterAddressTypeLink(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from(TABLES.letterAddressTypeLink)
      .delete()
      .eq('id', id);
    throwOnSupabaseError(error, 'Failed to delete letter address type link');
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete letter address type link',
    );
  }
}

// ---------------------------------------------------------------------------
// Document type masters + reference sequence
// ---------------------------------------------------------------------------

const DEFAULT_DOCUMENT_TYPE_SEEDS: Array<{
  code: string;
  labelEn: string;
  labelMr: string;
  sortOrder: number;
}> = [
  { code: 'VIP', labelEn: 'VIP', labelMr: 'VIP', sortOrder: 1 },
  { code: 'Department', labelEn: 'Department', labelMr: 'विभाग', sortOrder: 2 },
  { code: 'General', labelEn: 'General', labelMr: 'सामान्य', sortOrder: 3 },
  {
    code: 'SanctionOrder',
    labelEn: 'Sanction Order',
    labelMr: 'प्रशासकीय मंजुरी आदेश',
    sortOrder: 4,
  },
];

export async function ensureDocumentTypeDefaults(): Promise<void> {
  try {
    const { data: existingRows, error: existingError } = await supabase
      .from(TABLES.documentTypeMaster)
      .select('code');
    throwOnSupabaseError(existingError, 'Failed to list document types');

    const existingCodes = new Set(
      (existingRows ?? []).map((row) => String(row.code).toLowerCase()),
    );
    const missing = DEFAULT_DOCUMENT_TYPE_SEEDS.filter(
      (item) => !existingCodes.has(item.code.toLowerCase()),
    );
    if (missing.length === 0) return;

    const now = new Date().toISOString();
    const { error } = await supabase.from(TABLES.documentTypeMaster).insert(
      missing.map((item) =>
        toSnakeCaseKeys({
          code: item.code,
          labelEn: item.labelEn,
          labelMr: item.labelMr,
          lastSequence: 0,
          sortOrder: item.sortOrder,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }),
      ),
    );
    throwOnSupabaseError(error, 'Failed to seed document types');
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to seed document types');
  }
}

export async function getDocumentTypes({
  activeOnly = true,
}: {
  activeOnly?: boolean;
} = {}): Promise<Array<DocumentTypeMaster>> {
  try {
    await ensureDocumentTypeDefaults();
    let query = supabase
      .from(TABLES.documentTypeMaster)
      .select('*')
      .order('sort_order', { ascending: true })
      .order('code', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    throwOnSupabaseError(error, 'Failed to get document types');
    return (data ?? []).map(mapDocumentTypeMasterRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get document types');
  }
}

export async function getDocumentTypeById(
  id: string,
): Promise<DocumentTypeMaster | null> {
  try {
    const { data, error } = await supabase
      .from(TABLES.documentTypeMaster)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to get document type');
    return data ? mapDocumentTypeMasterRow(data) : null;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get document type');
  }
}

export async function getDocumentTypeByCode(
  code: string,
  { activeOnly = false }: { activeOnly?: boolean } = {},
): Promise<DocumentTypeMaster | null> {
  try {
    await ensureDocumentTypeDefaults();
    const { normalizeReferencePrefix } = await import(
      '@/lib/letters/reference-sequence'
    );
    const normalized = normalizeReferencePrefix(code);
    if (!normalized) return null;

    let query = supabase
      .from(TABLES.documentTypeMaster)
      .select('*')
      .ilike('code', normalized)
      .limit(1);

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.maybeSingle();
    throwOnSupabaseError(error, 'Failed to get document type by code');
    return data ? mapDocumentTypeMasterRow(data) : null;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get document type by code',
    );
  }
}

export async function createDocumentType({
  code,
  labelEn,
  labelMr,
  isActive = true,
  sortOrder = 0,
  createdBy,
}: {
  code: string;
  labelEn: string;
  labelMr: string;
  isActive?: boolean;
  sortOrder?: number;
  createdBy?: string | null;
}): Promise<DocumentTypeMaster> {
  try {
    const { normalizeReferencePrefix } = await import(
      '@/lib/letters/reference-sequence'
    );
    const normalizedCode = normalizeReferencePrefix(code);
    if (!normalizedCode) {
      throw new ChatSDKError('bad_request:database', 'Document type code is required');
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(TABLES.documentTypeMaster)
      .insert(
        toSnakeCaseKeys({
          code: normalizedCode,
          labelEn: labelEn.trim(),
          labelMr: labelMr.trim(),
          lastSequence: 0,
          isActive,
          sortOrder,
          createdBy: createdBy ?? null,
          createdAt: now,
          updatedAt: now,
        }),
      )
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to create document type');
    return mapDocumentTypeMasterRow(data);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to create document type');
  }
}

export async function updateDocumentType({
  id,
  code,
  labelEn,
  labelMr,
  isActive,
  sortOrder,
  updatedBy,
}: {
  id: string;
  code: string;
  labelEn: string;
  labelMr: string;
  isActive?: boolean;
  sortOrder?: number;
  updatedBy?: string | null;
}): Promise<DocumentTypeMaster> {
  try {
    const { normalizeReferencePrefix } = await import(
      '@/lib/letters/reference-sequence'
    );
    const normalizedCode = normalizeReferencePrefix(code);
    if (!normalizedCode) {
      throw new ChatSDKError('bad_request:database', 'Document type code is required');
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(TABLES.documentTypeMaster)
      .update(
        toSnakeCaseKeys({
          code: normalizedCode,
          labelEn: labelEn.trim(),
          labelMr: labelMr.trim(),
          isActive: isActive !== false,
          sortOrder: sortOrder ?? 0,
          updatedBy: updatedBy ?? null,
          updatedAt: now,
        }),
      )
      .eq('id', id)
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to update document type');
    return mapDocumentTypeMasterRow(data);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to update document type');
  }
}

export async function deleteDocumentType(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from(TABLES.documentTypeMaster)
      .delete()
      .eq('id', id);
    throwOnSupabaseError(error, 'Failed to delete document type');
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to delete document type');
  }
}

export async function peekDocumentTypeSequence(code: string): Promise<number> {
  const docType = await getDocumentTypeByCode(code, { activeOnly: true });
  if (!docType) {
    throw new ChatSDKError('bad_request:database', 'Document type not found');
  }
  return docType.lastSequence + 1;
}

/** Atomically increment and return the next sequence number for a document type. */
export async function allocateDocumentTypeSequence(code: string): Promise<number> {
  try {
    const { normalizeReferencePrefix } = await import(
      '@/lib/letters/reference-sequence'
    );
    const normalized = normalizeReferencePrefix(code);
    if (!normalized) {
      throw new ChatSDKError('bad_request:database', 'Document type code is required');
    }

    const rows = await pgSql`
      UPDATE "DocumentTypeMaster"
      SET
        last_sequence = last_sequence + 1,
        updated_at = now()
      WHERE lower(code) = lower(${normalized})
        AND is_active = true
      RETURNING last_sequence
    `;

    const next = Number(rows[0]?.last_sequence);
    if (!Number.isFinite(next) || next < 1) {
      throw new ChatSDKError(
        'bad_request:database',
        'Document type not found or inactive',
      );
    }
    return next;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to allocate document type sequence',
    );
  }
}

/** Raise the counter to at least `usedNumber` (manual override path). */
export async function bumpDocumentTypeSequence(
  code: string,
  usedNumber: number,
): Promise<number> {
  try {
    const { normalizeReferencePrefix } = await import(
      '@/lib/letters/reference-sequence'
    );
    const normalized = normalizeReferencePrefix(code);
    if (!normalized) {
      throw new ChatSDKError('bad_request:database', 'Document type code is required');
    }
    if (!Number.isFinite(usedNumber) || usedNumber < 1) {
      throw new ChatSDKError('bad_request:database', 'Invalid sequence number');
    }

    const rows = await pgSql`
      UPDATE "DocumentTypeMaster"
      SET
        last_sequence = GREATEST(last_sequence, ${Math.trunc(usedNumber)}),
        updated_at = now()
      WHERE lower(code) = lower(${normalized})
        AND is_active = true
      RETURNING last_sequence
    `;

    const last = Number(rows[0]?.last_sequence);
    if (!Number.isFinite(last)) {
      throw new ChatSDKError(
        'bad_request:database',
        'Document type not found or inactive',
      );
    }
    return last;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to bump document type sequence',
    );
  }
}

/**
 * Resolve the full reference for a save.
 * autoSequence (default true): atomically allocate next number.
 * manual: use client number and bump the counter with GREATEST.
 */
export async function resolveDocumentTypeReferenceForSave({
  code,
  autoSequence = true,
  clientNumber,
}: {
  code: string;
  autoSequence?: boolean;
  clientNumber?: string | number | null;
}): Promise<{ code: string; number: number; fullReference: string }> {
  const { formatReference, normalizeReferencePrefix } = await import(
    '@/lib/letters/reference-sequence'
  );
  const { toWesternDigits } = await import('@/lib/locale-digits');

  const docType = await getDocumentTypeByCode(code, { activeOnly: true });
  if (!docType) {
    throw new ChatSDKError('bad_request:database', 'Document type not found or inactive');
  }
  const resolvedCode = normalizeReferencePrefix(docType.code);

  if (autoSequence !== false) {
    const number = await allocateDocumentTypeSequence(resolvedCode);
    return {
      code: resolvedCode,
      number,
      fullReference: formatReference(resolvedCode, number),
    };
  }

  const western = toWesternDigits(String(clientNumber ?? '')).replace(/\D/g, '');
  const number = Number.parseInt(western, 10);
  if (!Number.isFinite(number) || number < 1) {
    throw new ChatSDKError('bad_request:database', 'Reference number is required');
  }
  await bumpDocumentTypeSequence(resolvedCode, number);
  return {
    code: resolvedCode,
    number,
    fullReference: formatReference(resolvedCode, number),
  };
}

// ---------------------------------------------------------------------------
// Letters
// ---------------------------------------------------------------------------

export async function getLetterByReferenceNo(
  referenceNo: string,
): Promise<Letter | null> {
  try {
    const { data, error } = await supabase
      .from(TABLES.letter)
      .select('*')
      .eq('reference_no', referenceNo)
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to get letter by reference no');
    return data ? mapLetterRow(data) : null;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get letter by reference no');
  }
}

/** Letter + outward register refs that may belong to a given prefix (for sequence). */
export async function getReferenceNosForPrefix(prefix: string): Promise<string[]> {
  try {
    const { normalizeReferencePrefix } = await import(
      '@/lib/letters/reference-sequence'
    );
    const normalized = normalizeReferencePrefix(prefix);
    if (!normalized) return [];

    const likePattern = `${normalized}/%`;
    const [letterRows, registerRows] = await Promise.all([
      pgSql`
        SELECT reference_no AS ref
        FROM "Letter"
        WHERE reference_no ILIKE ${likePattern}
           OR lower(reference_no) = lower(${normalized})
      `,
      pgSql`
        SELECT ref_no AS ref
        FROM "RegisterEntry"
        WHERE type = 'outward'
          AND ref_no IS NOT NULL
          AND (
            ref_no ILIKE ${likePattern}
            OR lower(ref_no) = lower(${normalized})
          )
      `,
    ]);

    return [
      ...letterRows.map((row) => String(row.ref ?? '')),
      ...registerRows.map((row) => String(row.ref ?? '')),
    ].filter(Boolean);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get reference numbers for prefix',
    );
  }
}

export async function createLetter({
  letterMasterId,
  letterType,
  letterLocale,
  referenceNo,
  title,
  fields,
  renderedHtml,
  paperSize,
  createdBy,
  beneficiaryServiceId,
}: {
  letterMasterId?: string | null;
  letterType: string;
  letterLocale: string;
  referenceNo: string;
  title: string;
  fields: unknown;
  renderedHtml: string;
  paperSize?: 'a4' | 'a5' | 'b5';
  createdBy?: string | null;
  beneficiaryServiceId?: string | null;
}): Promise<Letter> {
  try {
    const { resolveLetterPaperSize } = await import('@/lib/letters/paper-size');
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(TABLES.letter)
      .insert(
        toSnakeCaseKeys({
          letterMasterId: letterMasterId || null,
          letterType,
          letterLocale,
          referenceNo,
          title,
          fields,
          renderedHtml,
          paperSize: resolveLetterPaperSize(paperSize, letterType),
          createdBy: createdBy || null,
          beneficiaryServiceId: beneficiaryServiceId || null,
          createdAt: now,
          updatedAt: now,
        }),
      )
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to create letter');
    return mapLetterRow(data);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to create letter');
  }
}

export async function getLetters({
  limit = 50,
  beneficiaryServiceId,
}: {
  limit?: number;
  beneficiaryServiceId?: string;
} = {}): Promise<Array<Letter>> {
  try {
    let query = supabase
      .from(TABLES.letter)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (beneficiaryServiceId) {
      query = query.eq('beneficiary_service_id', beneficiaryServiceId);
    }
    const { data, error } = await query;
    throwOnSupabaseError(error, 'Failed to get letters');
    return (data ?? []).map(mapLetterRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get letters');
  }
}

export async function getLetterById(id: string): Promise<Letter | null> {
  try {
    const { data, error } = await supabase
      .from(TABLES.letter)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to get letter by id');
    return data ? mapLetterRow(data) : null;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get letter by id');
  }
}

export async function updateLetterRenderedHtml({
  id,
  renderedHtml,
  letterMasterId,
}: {
  id: string;
  renderedHtml: string;
  letterMasterId?: string | null;
}): Promise<Letter> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(TABLES.letter)
      .update(
        toSnakeCaseKeys({
          renderedHtml,
          letterMasterId: letterMasterId ?? undefined,
          updatedAt: now,
        }),
      )
      .eq('id', id)
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to update letter rendered html');
    return mapLetterRow(data);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to update letter rendered html');
  }
}

export async function updateLetterPdfStoragePath({
  id,
  pdfStoragePath,
}: {
  id: string;
  pdfStoragePath: string;
}): Promise<Letter> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(TABLES.letter)
      .update(
        toSnakeCaseKeys({
          pdfStoragePath,
          updatedAt: now,
        }),
      )
      .eq('id', id)
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to update letter PDF storage path');
    return mapLetterRow(data);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update letter PDF storage path',
    );
  }
}

export async function deleteLetter(id: string): Promise<void> {
  try {
    const existing = await getLetterById(id);
    if (existing?.pdfStoragePath) {
      const { LETTER_PDF_BUCKET } = await import('@/lib/letters/pdf-storage');
      const { error: storageError } = await supabase.storage
        .from(LETTER_PDF_BUCKET)
        .remove([existing.pdfStoragePath]);
      if (storageError) {
        console.error('Failed to delete letter PDF from storage', storageError);
      }
    }

    const { error } = await supabase.from(TABLES.letter).delete().eq('id', id);
    throwOnSupabaseError(error, 'Failed to delete letter');
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to delete letter');
  }
}

// ---------------------------------------------------------------------------
// Register entries
// ---------------------------------------------------------------------------

export async function createRegisterEntry({
  type,
  documentType,
  date,
  fromTo,
  subject,
  projectId,
  mode,
  refNo,
  officer,
  createdBy,
}: {
  type: 'inward' | 'outward';
  documentType?: string;
  date: Date | string;
  fromTo: string;
  subject: string;
  projectId?: string;
  mode?: string;
  refNo?: string;
  officer?: string;
  createdBy: string;
}): Promise<RegisterEntry> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(TABLES.registerEntry)
      .insert(
        toSnakeCaseKeys({
          type,
          documentType: documentType || 'General',
          date: formatDateToString(date),
          fromTo,
          subject,
          projectId: projectId || null,
          mode: mode || null,
          refNo: refNo || null,
          officer: officer || null,
          createdBy,
          createdAt: now,
          updatedAt: now,
        }),
      )
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to create register entry');
    return mapRegisterEntryRow(data);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to create register entry');
  }
}

export async function getRegisterEntries({
  type,
  startDate,
  endDate,
  limit = 100,
}: {
  type?: 'inward' | 'outward';
  startDate?: Date | string;
  endDate?: Date | string;
  limit?: number;
} = {}): Promise<Array<RegisterEntry>> {
  try {
    let query = supabase.from(TABLES.registerEntry).select('*');
    if (type) query = query.eq('type', type);
    if (startDate) query = query.gte('date', formatDateToString(startDate));
    if (endDate) query = query.lte('date', formatDateToString(endDate));
    const { data, error } = await query
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);
    throwOnSupabaseError(error, 'Failed to get register entries');
    return (data ?? []).map(mapRegisterEntryRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get register entries');
  }
}

export async function getRegisterEntriesWithAttachments({
  type,
  startDate,
  endDate,
  projectIds,
  projectStatus,
  search,
  limit = 100,
}: {
  type?: 'inward' | 'outward';
  startDate?: Date | string;
  endDate?: Date | string;
  projectIds?: string[];
  projectStatus?: 'Concept' | 'Proposal' | 'In Progress' | 'Completed';
  search?: string;
  limit?: number;
} = {}): Promise<Array<RegisterEntry & { attachments: RegisterAttachment[] }>> {
  try {
    const conditions: ReturnType<typeof pgSql>[] = [];
    if (type) conditions.push(pgSql`re.type = ${type}`);
    if (startDate) conditions.push(pgSql`re.date >= ${formatDateToString(startDate)}`);
    if (endDate) conditions.push(pgSql`re.date <= ${formatDateToString(endDate)}`);
    if (projectIds && projectIds.length > 0) {
      conditions.push(pgSql`re.project_id = ANY(${projectIds})`);
    }
    if (projectStatus) conditions.push(pgSql`mp.status = ${projectStatus}`);
    const searchTerm = search?.trim();
    if (searchTerm) {
      const like = `%${searchTerm}%`;
      conditions.push(pgSql`(
        re.ref_no ILIKE ${like}
        OR re.subject ILIKE ${like}
        OR re.from_to ILIKE ${like}
      )`);
    }

    const whereClause =
      conditions.length > 0
        ? pgSql`WHERE ${conditions.reduce((acc, cond, i) => (i === 0 ? cond : pgSql`${acc} AND ${cond}`))}`
        : pgSql``;

    const joinProject = projectStatus
      ? pgSql`LEFT JOIN "MlaProject" mp ON re.project_id = mp.id`
      : pgSql``;

    const results = await pgSql`
      SELECT
        re.id AS entry_id,
        re.type AS entry_type,
        re.document_type,
        re.date AS entry_date,
        re.from_to,
        re.subject,
        re.project_id,
        re.mode,
        re.ref_no,
        re.officer,
        re.created_by AS entry_created_by,
        re.created_at AS entry_created_at,
        re.updated_at AS entry_updated_at,
        ra.id AS attachment_id,
        ra.entry_id AS attachment_entry_id,
        ra.file_name,
        ra.file_size_kb,
        ra.file_url,
        ra.created_at AS attachment_created_at
      FROM "RegisterEntry" re
      LEFT JOIN "RegisterAttachment" ra ON re.id = ra.entry_id
      ${joinProject}
      ${whereClause}
      ORDER BY re.date DESC, re.created_at DESC
      LIMIT ${limit * 10}
    `;

    const entriesMap = new Map<string, RegisterEntry & { attachments: RegisterAttachment[] }>();
    for (const row of results) {
      const entryId = String(row.entry_id);
      if (!entriesMap.has(entryId)) {
        entriesMap.set(entryId, {
          ...mapRegisterEntryRow({
            id: row.entry_id,
            type: row.entry_type,
            document_type: row.document_type,
            date: row.entry_date,
            from_to: row.from_to,
            subject: row.subject,
            project_id: row.project_id,
            mode: row.mode,
            ref_no: row.ref_no,
            officer: row.officer,
            created_by: row.entry_created_by,
            created_at: row.entry_created_at,
            updated_at: row.entry_updated_at,
          }),
          attachments: [],
        });
      }
      if (row.attachment_id != null) {
        const entry = entriesMap.get(entryId);
        if (entry) {
          entry.attachments.push(
            mapRegisterAttachmentRow({
              id: row.attachment_id,
              entry_id: row.attachment_entry_id,
              file_name: row.file_name,
              file_size_kb: row.file_size_kb,
              file_url: row.file_url,
              created_at: row.attachment_created_at,
            }),
          );
        }
      }
    }

    const entries = Array.from(entriesMap.values()).slice(0, limit);
    const linkFlags = await getRegisterEntryLinkFlags(entries.map((e) => e.id));
    for (const entry of entries) {
      const flags = linkFlags.get(entry.id);
      entry.linkedToAdm = flags?.linkedToAdm ?? false;
      entry.linkedToProject = flags?.linkedToProject ?? false;
    }
    return entries;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get register entries with attachments');
  }
}

/** Whether register entries are linked from ADM docs or project attachments. */
export async function getRegisterEntryLinkFlags(
  entryIds: string[],
): Promise<Map<string, { linkedToAdm: boolean; linkedToProject: boolean }>> {
  const result = new Map<string, { linkedToAdm: boolean; linkedToProject: boolean }>();
  if (entryIds.length === 0) return result;

  for (const id of entryIds) {
    result.set(id, { linkedToAdm: false, linkedToProject: false });
  }

  try {
    const { data: admDocs, error: admError } = await supabase
      .from(TABLES.admDocument)
      .select('register_entry_id')
      .in('register_entry_id', entryIds);
    throwOnSupabaseError(admError, 'Failed to get ADM document links');
    for (const row of admDocs ?? []) {
      const id = String(row.register_entry_id);
      const flags = result.get(id);
      if (flags) flags.linkedToAdm = true;
    }

    const { data: projectDocs, error: projectError } = await supabase
      .from(TABLES.projectAttachment)
      .select('register_entry_id')
      .in('register_entry_id', entryIds);
    throwOnSupabaseError(projectError, 'Failed to get project attachment links');
    for (const row of projectDocs ?? []) {
      const id = String(row.register_entry_id);
      const flags = result.get(id);
      if (flags) flags.linkedToProject = true;
    }
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get register entry link flags',
    );
  }

  return result;
}

export async function getRegisterEntriesByProjectId(
  projectId: string,
): Promise<Array<RegisterEntry>> {
  try {
    const { data, error } = await supabase
      .from(TABLES.registerEntry)
      .select('*')
      .eq('project_id', projectId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    throwOnSupabaseError(error, 'Failed to get register entries for project');
    return (data ?? []).map(mapRegisterEntryRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get register entries for project');
  }
}

export async function getRegisterEntryById(id: string): Promise<RegisterEntry | null> {
  try {
    const { data, error } = await supabase
      .from(TABLES.registerEntry)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to get register entry');
    return data ? mapRegisterEntryRow(data) : null;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get register entry');
  }
}

export async function updateRegisterEntry(
  id: string,
  data: Partial<Omit<RegisterEntry, 'id' | 'createdBy' | 'createdAt'>>,
): Promise<RegisterEntry | null> {
  try {
    const snakePatch = toSnakeCaseKeys({ ...data, updatedAt: new Date().toISOString() });
    const { data: updated, error } = await supabase
      .from(TABLES.registerEntry)
      .update(snakePatch)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to update register entry');
    return updated ? mapRegisterEntryRow(updated) : null;
  } catch (error) {
    console.error('Error updating register entry:', error);
    if (error instanceof ChatSDKError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Failed to update register entry';
    throw new ChatSDKError('bad_request:database', errorMessage);
  }
}

export async function deleteRegisterEntry(id: string): Promise<void> {
  try {
    const { error } = await supabase.from(TABLES.registerEntry).delete().eq('id', id);
    throwOnSupabaseError(error, 'Failed to delete register entry');
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to delete register entry');
  }
}

export async function getRegisterAttachments(entryId: string): Promise<Array<RegisterAttachment>> {
  try {
    const { data, error } = await supabase
      .from(TABLES.registerAttachment)
      .select('*')
      .eq('entry_id', entryId)
      .order('created_at', { ascending: true });
    throwOnSupabaseError(error, 'Failed to get register attachments');
    return (data ?? []).map(mapRegisterAttachmentRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get register attachments');
  }
}

export async function createRegisterAttachment({
  entryId,
  fileName,
  fileSizeKb,
  fileUrl,
}: {
  entryId: string;
  fileName: string;
  fileSizeKb: number;
  fileUrl?: string;
}): Promise<RegisterAttachment> {
  try {
    const { data, error } = await supabase
      .from(TABLES.registerAttachment)
      .insert(
        toSnakeCaseKeys({
          entryId,
          fileName,
          fileSizeKb,
          fileUrl: fileUrl || null,
          createdAt: new Date().toISOString(),
        }),
      )
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to create register attachment');
    return mapRegisterAttachmentRow(data);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to create register attachment');
  }
}

export async function deleteRegisterAttachment(id: string): Promise<void> {
  try {
    const { error } = await supabase.from(TABLES.registerAttachment).delete().eq('id', id);
    throwOnSupabaseError(error, 'Failed to delete register attachment');
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to delete register attachment');
  }
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function createProject({
  name,
  ward,
  wardGeoId,
  boothNo,
  type,
  status,
  department,
  category,
  taluka,
  village,
  estimatedCost,
  approvalStatus,
  nocRequired,
  nocStatus,
  remarks,
  physicalStatus,
  bhoomiPujanDone,
  bhoomiPujanDate,
  lokarpanDone,
  lokarpanDate,
  createdBy,
}: {
  name: string;
  ward?: string;
  wardGeoId?: string | null;
  boothNo?: string | null;
  type?: string;
  status?: 'Concept' | 'Proposal' | 'In Progress' | 'Completed';
  department?: string | null;
  category?: string | null;
  taluka?: string | null;
  village?: string | null;
  estimatedCost?: number;
  approvalStatus?: MlaProject['approvalStatus'];
  nocRequired?: boolean;
  nocStatus?: MlaProject['nocStatus'];
  remarks?: string | null;
  physicalStatus?: MlaProject['physicalStatus'];
  bhoomiPujanDone?: boolean;
  bhoomiPujanDate?: string | null;
  lokarpanDone?: boolean;
  lokarpanDate?: string | null;
  createdBy: string;
}): Promise<MlaProject> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(TABLES.mlaProject)
      .insert(
        toSnakeCaseKeys({
          name,
          ward: ward || null,
          wardGeoId: wardGeoId ?? null,
          boothNo: boothNo ?? null,
          type: type || null,
          status: status || 'Concept',
          department: department ?? null,
          category: category ?? null,
          taluka: taluka ?? null,
          village: village ?? null,
          estimatedCost: estimatedCost ?? 0,
          approvalStatus: approvalStatus ?? 'Pending',
          nocRequired: nocRequired ?? false,
          nocStatus: nocStatus ?? (nocRequired ? 'Pending' : 'NotRequired'),
          remarks: remarks ?? null,
          physicalStatus: physicalStatus ?? 'WNS',
          bhoomiPujanDone: bhoomiPujanDone ?? false,
          bhoomiPujanDate: bhoomiPujanDate ?? null,
          lokarpanDone: lokarpanDone ?? false,
          lokarpanDate: lokarpanDate ?? null,
          createdBy,
          createdAt: now,
          updatedAt: now,
        }),
      )
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to create project');
    return mapMlaProjectRow(data);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to create project');
  }
}

export async function getProjects({
  status,
  limit = 100,
}: {
  status?: 'Concept' | 'Proposal' | 'In Progress' | 'Completed';
  limit?: number;
} = {}): Promise<Array<MlaProject>> {
  try {
    let query = supabase.from(TABLES.mlaProject).select('*');
    if (status) query = query.eq('status', status);
    const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);
    throwOnSupabaseError(error, 'Failed to get projects');
    return (data ?? []).map(mapMlaProjectRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get projects');
  }
}

export async function getProjectById(id: string): Promise<MlaProject | null> {
  try {
    const { data, error } = await supabase
      .from(TABLES.mlaProject)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to get project');
    return data ? mapMlaProjectRow(data) : null;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get project');
  }
}

export async function updateProject(
  id: string,
  data: Partial<Omit<MlaProject, 'id' | 'createdBy' | 'createdAt'>>,
): Promise<MlaProject | null> {
  try {
    const snakePatch = toSnakeCaseKeys({ ...data, updatedAt: new Date().toISOString() });
    const { data: updated, error } = await supabase
      .from(TABLES.mlaProject)
      .update(snakePatch)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to update project');
    return updated ? mapMlaProjectRow(updated) : null;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to update project');
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    const { error } = await supabase.from(TABLES.mlaProject).delete().eq('id', id);
    throwOnSupabaseError(error, 'Failed to delete project');
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to delete project');
  }
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export async function getAllRoles(): Promise<Array<Role & { permissions: Record<string, boolean> }>> {
  try {
    const { data: roles, error: rolesError } = await supabase
      .from(TABLES.role)
      .select('*')
      .order('name', { ascending: true });
    throwOnSupabaseError(rolesError, 'Failed to get roles');

    const { data: allPermissions, error: permError } = await supabase
      .from(TABLES.roleModulePermissions)
      .select('*');
    throwOnSupabaseError(permError, 'Failed to get role permissions');

    return (roles ?? []).map((r) => {
      const role = mapRoleRow(r);
      const permissionsMap: Record<string, boolean> = {};
      for (const perm of allPermissions ?? []) {
        const row = mapRoleModulePermissionRow(perm);
        if (row.roleId === role.id) permissionsMap[row.moduleKey] = row.hasAccess;
      }
      return { ...role, permissions: permissionsMap };
    });
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get all roles');
  }
}

export async function getRoleById(
  roleId: string,
): Promise<(Role & { permissions: Record<string, boolean> }) | null> {
  try {
    const { data: roleRecord, error } = await supabase
      .from(TABLES.role)
      .select('*')
      .eq('id', roleId)
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to get role by id');
    if (!roleRecord) return null;

    const { data: permissions, error: permError } = await supabase
      .from(TABLES.roleModulePermissions)
      .select('*')
      .eq('role_id', roleId);
    throwOnSupabaseError(permError, 'Failed to get role permissions');

    const permissionsMap: Record<string, boolean> = {};
    for (const perm of permissions ?? []) {
      const row = mapRoleModulePermissionRow(perm);
      permissionsMap[row.moduleKey] = row.hasAccess;
    }

    return { ...mapRoleRow(roleRecord), permissions: permissionsMap };
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get role by id');
  }
}

export async function getRoleAccessibleModules(roleId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from(TABLES.roleModulePermissions)
      .select('*')
      .eq('role_id', roleId)
      .eq('has_access', true);
    throwOnSupabaseError(error, 'Failed to get role accessible modules');
    return (data ?? []).map((perm) => mapRoleModulePermissionRow(perm).moduleKey);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get role accessible modules');
  }
}

export async function createRole(
  name: string,
  description: string | null,
  permissions: Record<string, boolean>,
  defaultLandingModule?: string | null,
): Promise<Role> {
  try {
    if (defaultLandingModule && defaultLandingModule.trim() !== '') {
      const accessibleModules = Object.entries(permissions)
        .filter(([, hasAccess]) => hasAccess)
        .map(([moduleKey]) => moduleKey);
      if (!accessibleModules.includes(defaultLandingModule)) {
        throw new ChatSDKError(
          'bad_request:api',
          `Default landing module "${defaultLandingModule}" must be one of the role's accessible modules`,
        );
      }
    }

    const now = new Date().toISOString();
    const { data: newRole, error } = await supabase
      .from(TABLES.role)
      .insert({
        name,
        description,
        default_landing_module:
          defaultLandingModule && defaultLandingModule.trim() !== ''
            ? defaultLandingModule
            : null,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to create role');
    const role = mapRoleRow(newRole);

    if (Object.keys(permissions).length > 0) {
      const permissionEntries = Object.entries(permissions).map(([moduleKey, hasAccess]) => ({
        role_id: role.id,
        module_key: moduleKey,
        has_access: hasAccess,
        created_at: now,
        updated_at: now,
      }));
      const { error: permError } = await supabase
        .from(TABLES.roleModulePermissions)
        .insert(permissionEntries);
      throwOnSupabaseError(permError, 'Failed to create role permissions');
    }

    return role;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to create role');
  }
}

export async function updateRole(
  roleId: string,
  name: string,
  description: string | null,
  permissions: Record<string, boolean>,
  defaultLandingModule?: string | null,
): Promise<Role> {
  try {
    if (defaultLandingModule && defaultLandingModule.trim() !== '') {
      const accessibleModules = Object.entries(permissions)
        .filter(([, hasAccess]) => hasAccess)
        .map(([moduleKey]) => moduleKey);
      if (!accessibleModules.includes(defaultLandingModule)) {
        throw new ChatSDKError(
          'bad_request:api',
          `Default landing module "${defaultLandingModule}" must be one of the role's accessible modules`,
        );
      }
    }

    const now = new Date().toISOString();
    const { data: updatedRole, error } = await supabase
      .from(TABLES.role)
      .update({
        name,
        description,
        default_landing_module:
          defaultLandingModule && defaultLandingModule.trim() !== ''
            ? defaultLandingModule
            : null,
        updated_at: now,
      })
      .eq('id', roleId)
      .select('*')
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to update role');
    if (!updatedRole) {
      throw new ChatSDKError('bad_request:database', 'Role not found');
    }

    await supabase.from(TABLES.roleModulePermissions).delete().eq('role_id', roleId);

    if (Object.keys(permissions).length > 0) {
      const permissionEntries = Object.entries(permissions).map(([moduleKey, hasAccess]) => ({
        role_id: roleId,
        module_key: moduleKey,
        has_access: hasAccess,
        created_at: now,
        updated_at: now,
      }));
      const { error: permError } = await supabase
        .from(TABLES.roleModulePermissions)
        .insert(permissionEntries);
      throwOnSupabaseError(permError, 'Failed to update role permissions');
    }

    return mapRoleRow(updatedRole);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to update role');
  }
}

export async function deleteRole(roleId: string): Promise<void> {
  try {
    const { data: usersWithRole, error: checkError } = await supabase
      .from(TABLES.user)
      .select('id')
      .eq('role_id', roleId)
      .limit(1);
    throwOnSupabaseError(checkError, 'Failed to check users with role');

    if ((usersWithRole?.length ?? 0) > 0) {
      throw new ChatSDKError(
        'bad_request:database',
        'Cannot delete role: users are still assigned to this role',
      );
    }

    const { error } = await supabase.from(TABLES.role).delete().eq('id', roleId);
    throwOnSupabaseError(error, 'Failed to delete role');
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to delete role');
  }
}

export async function getUsersWithRole(roleId: string): Promise<Array<User>> {
  try {
    const { data, error } = await supabase
      .from(TABLES.user)
      .select('*')
      .eq('role_id', roleId)
      .order('user_id', { ascending: true });
    throwOnSupabaseError(error, 'Failed to get users with role');
    return (data ?? []).map(mapUserRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get users with role');
  }
}

// ---------------------------------------------------------------------------
// Export jobs
// ---------------------------------------------------------------------------

export async function createExportJob({
  type,
  format,
  filters,
  createdBy,
}: {
  type: string;
  format: 'pdf' | 'excel' | 'csv';
  filters?: Record<string, unknown>;
  createdBy: string;
}): Promise<ExportJob> {
  try {
    const { data, error } = await supabase
      .from(TABLES.exportJob)
      .insert(
        toSnakeCaseKeys({
          type,
          format,
          filters: filters || {},
          status: 'pending',
          progress: 0,
          createdBy,
        }),
      )
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to create export job');
    return mapExportJobRow(data);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to create export job');
  }
}

export async function getExportJobById(id: string): Promise<ExportJob | null> {
  try {
    const { data, error } = await supabase
      .from(TABLES.exportJob)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to get export job');
    return data ? mapExportJobRow(data) : null;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get export job');
  }
}

export async function getExportJobsByUser(userId: string, limit = 10): Promise<ExportJob[]> {
  try {
    const { data, error } = await supabase
      .from(TABLES.exportJob)
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    throwOnSupabaseError(error, 'Failed to get export jobs');
    return (data ?? []).map(mapExportJobRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get export jobs');
  }
}

export async function updateExportJobProgress({
  id,
  status,
  progress,
  processedRecords,
  totalRecords,
  fileUrl,
  fileName,
  fileSizeKb,
  errorMessage,
}: {
  id: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  processedRecords?: number;
  totalRecords?: number;
  fileUrl?: string;
  fileName?: string;
  fileSizeKb?: number;
  errorMessage?: string;
}): Promise<ExportJob | null> {
  try {
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status !== undefined) updateData.status = status;
    if (progress !== undefined) updateData.progress = progress;
    if (processedRecords !== undefined) updateData.processed_records = processedRecords;
    if (totalRecords !== undefined) updateData.total_records = totalRecords;
    if (fileUrl !== undefined) updateData.file_url = fileUrl;
    if (fileName !== undefined) updateData.file_name = fileName;
    if (fileSizeKb !== undefined) updateData.file_size_kb = fileSizeKb;
    if (errorMessage !== undefined) updateData.error_message = errorMessage;
    if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from(TABLES.exportJob)
      .update(updateData)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to update export job');
    return data ? mapExportJobRow(data) : null;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to update export job');
  }
}

export async function deleteExportJob(id: string): Promise<void> {
  try {
    const { error } = await supabase.from(TABLES.exportJob).delete().eq('id', id);
    throwOnSupabaseError(error, 'Failed to delete export job');
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to delete export job');
  }
}

// ---------------------------------------------------------------------------
// Field visitor helpers
// ---------------------------------------------------------------------------

export type FieldVisitorVoterRow = {
  epicNumber: string;
  fullName: string;
  relationType: string | null;
  relationName: string | null;
  familyGrouping: string | null;
  houseNumber: string | null;
  religion: string | null;
  caste: string | null;
  age: number | null;
  gender: string | null;
  address: string | null;
  srNo: string | null;
  isProfiled: boolean | null;
  education: string | null;
  occupationType: string | null;
  occupationDetail: string | null;
  region: string | null;
  profileReligion: string | null;
  profileCaste: string | null;
  isOurSupporter: boolean | null;
  feedback: string | null;
  influencerType: string | null;
  vehicleType: string | null;
  profiledAt: Date | null;
};

function mapFieldVisitorVoterRow(row: Record<string, unknown>): FieldVisitorVoterRow {
  return {
    epicNumber: String(row.epic_number),
    fullName: String(row.full_name),
    relationType: row.relation_type != null ? String(row.relation_type) : null,
    relationName: row.relation_name != null ? String(row.relation_name) : null,
    familyGrouping: row.family_grouping != null ? String(row.family_grouping) : null,
    houseNumber: row.house_number != null ? String(row.house_number) : null,
    religion: row.religion != null ? String(row.religion) : null,
    caste: row.caste != null ? String(row.caste) : null,
    age: row.age != null ? Number(row.age) : null,
    gender: row.gender != null ? String(row.gender) : null,
    address: row.address != null ? String(row.address) : null,
    srNo: row.sr_no != null ? String(row.sr_no) : null,
    isProfiled: row.is_profiled != null ? Boolean(row.is_profiled) : null,
    education: row.education != null ? String(row.education) : null,
    occupationType: row.occupation_type != null ? String(row.occupation_type) : null,
    occupationDetail: row.occupation_detail != null ? String(row.occupation_detail) : null,
    region: row.region != null ? String(row.region) : null,
    profileReligion: row.profile_religion != null ? String(row.profile_religion) : null,
    profileCaste: row.profile_caste != null ? String(row.profile_caste) : null,
    isOurSupporter: row.is_our_supporter != null ? Boolean(row.is_our_supporter) : null,
    feedback: row.feedback != null ? String(row.feedback) : null,
    influencerType: row.influencer_type != null ? String(row.influencer_type) : null,
    vehicleType: row.vehicle_type != null ? String(row.vehicle_type) : null,
    profiledAt: row.profiled_at ? new Date(String(row.profiled_at)) : null,
  };
}

const FIELD_VISITOR_VOTER_SELECT = pgSql`
  vm.epic_number,
  vm.full_name,
  vm.relation_type,
  vm.relation_name,
  vm.family_grouping,
  vm.house_number,
  vm.religion,
  vm.caste,
  vm.age,
  vm.gender,
  vm.address,
  em.sr_no,
  vp.is_profiled,
  vp.education,
  vp.occupation_type,
  vp.occupation_detail,
  vp.region,
  vp.religion AS profile_religion,
  vp.caste AS profile_caste,
  vp.is_our_supporter,
  vp.feedback,
  vp.influencer_type,
  vp.vehicle_type,
  vp.profiled_at
`;

export async function getFieldVisitorVoters({
  userId,
  boothNo,
  electionId,
  profiledFilter,
}: {
  userId: string;
  boothNo: string;
  electionId?: string | null;
  profiledFilter?: 'true' | 'false' | null;
}): Promise<{
  voters: FieldVisitorVoterRow[];
  stats: { total: number; profiled: number; pending: number };
  electionId: string;
}> {
  let targetElectionId = electionId;
  if (!targetElectionId) {
    const [latestElection] = await pgSql`
      SELECT election_id FROM "BoothMaster"
      WHERE booth_no = ${boothNo}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    if (!latestElection) {
      return { voters: [], stats: { total: 0, profiled: 0, pending: 0 }, electionId: '' };
    }
    targetElectionId = String(latestElection.election_id);
  }

  const hasAccess = await verifyFieldVisitorBoothAccess(userId, targetElectionId, boothNo);
  if (!hasAccess) {
    throw new ChatSDKError('forbidden:api', 'You do not have access to this booth');
  }

  const profileFilter =
    profiledFilter === 'true'
      ? pgSql`AND vp.is_profiled = true`
      : profiledFilter === 'false'
        ? pgSql`AND (vp.is_profiled IS NULL OR vp.is_profiled = false)`
        : pgSql``;

  const voterRows = await pgSql`
    SELECT ${FIELD_VISITOR_VOTER_SELECT}
    FROM "VoterMaster" vm
    INNER JOIN "ElectionMapping" em
      ON vm.epic_number = em.epic_number
      AND em.election_id = ${targetElectionId}
      AND em.booth_no = ${boothNo}
    LEFT JOIN "VoterProfile" vp ON vm.epic_number = vp.epic_number
    WHERE 1=1 ${profileFilter}
    ORDER BY em.sr_no ASC, vm.full_name ASC
  `;

  const [stats] = await pgSql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(CASE WHEN vp.is_profiled = true THEN 1 END)::int AS profiled
    FROM "VoterMaster" vm
    INNER JOIN "ElectionMapping" em
      ON vm.epic_number = em.epic_number
      AND em.election_id = ${targetElectionId}
      AND em.booth_no = ${boothNo}
    LEFT JOIN "VoterProfile" vp ON vm.epic_number = vp.epic_number
  `;

  const total = Number(stats?.total || 0);
  const profiled = Number(stats?.profiled || 0);

  return {
    voters: voterRows.map(mapFieldVisitorVoterRow),
    stats: { total, profiled, pending: total - profiled },
    electionId: targetElectionId,
  };
}

export async function verifyFieldVisitorBoothAccess(
  userId: string,
  electionId: string,
  boothNo: string,
): Promise<boolean> {
  const [assignment] = await pgSql`
    SELECT id FROM "UserPartAssignment"
    WHERE user_id = ${userId}
      AND election_id = ${electionId}
      AND booth_no = ${boothNo}
    LIMIT 1
  `;
  return Boolean(assignment);
}

export async function getFieldVisitorRelatedVoters({
  familyGrouping,
  epicNumber,
}: {
  familyGrouping: string;
  epicNumber: string;
}): Promise<FieldVisitorVoterRow[]> {
  const rows = await pgSql`
    SELECT ${FIELD_VISITOR_VOTER_SELECT}
    FROM "VoterMaster" vm
    LEFT JOIN "ElectionMapping" em ON vm.epic_number = em.epic_number
    LEFT JOIN "VoterProfile" vp ON vm.epic_number = vp.epic_number
    WHERE vm.family_grouping = ${familyGrouping}
      AND vp.is_profiled IS NULL
    LIMIT 10
  `;
  return rows
    .map(mapFieldVisitorVoterRow)
    .filter((v) => v.epicNumber !== epicNumber);
}

export async function getFieldVisitorProfile(
  epicNumber: string,
): Promise<FieldVisitorVoterRow | null> {
  const [row] = await pgSql`
    SELECT ${FIELD_VISITOR_VOTER_SELECT}
    FROM "VoterMaster" vm
    LEFT JOIN "ElectionMapping" em ON vm.epic_number = em.epic_number
    LEFT JOIN "VoterProfile" vp ON vm.epic_number = vp.epic_number
    WHERE vm.epic_number = ${epicNumber}
    LIMIT 1
  `;
  return row ? mapFieldVisitorVoterRow(row) : null;
}

export async function getFieldVisitorFamily(epicNumber: string): Promise<{
  familyMembers: FieldVisitorVoterRow[];
  primaryVoter: Pick<VoterMaster, 'epicNumber' | 'fullName' | 'religion' | 'caste' | 'familyGrouping'> | null;
}> {
  const [voter] = await pgSql`
    SELECT * FROM "VoterMaster" WHERE epic_number = ${epicNumber} LIMIT 1
  `;
  if (!voter) return { familyMembers: [], primaryVoter: null };
  if (!voter.family_grouping) {
    return {
      familyMembers: [],
      primaryVoter: mapVoterMasterRow(voter),
    };
  }

  const rows = await pgSql`
    SELECT
      vm.epic_number,
      vm.full_name,
      vm.relation_type,
      vm.relation_name,
      vm.family_grouping,
      vm.religion,
      vm.caste,
      vm.age,
      vm.gender,
      NULL::text AS house_number,
      NULL::text AS address,
      NULL::text AS sr_no,
      vp.is_profiled,
      vp.education,
      vp.occupation_type,
      NULL::text AS occupation_detail,
      NULL::text AS region,
      NULL::text AS profile_religion,
      NULL::text AS profile_caste,
      vp.is_our_supporter,
      NULL::text AS feedback,
      vp.influencer_type,
      vp.vehicle_type,
      NULL::timestamptz AS profiled_at
    FROM "VoterMaster" vm
    LEFT JOIN "VoterProfile" vp ON vm.epic_number = vp.epic_number
    WHERE vm.family_grouping = ${voter.family_grouping}
      AND vm.epic_number != ${epicNumber}
    ORDER BY vm.full_name ASC
  `;

  return {
    familyMembers: rows.map(mapFieldVisitorVoterRow),
    primaryVoter: mapVoterMasterRow(voter),
  };
}

export async function saveFieldVisitorProfile(
  profileData: {
    epicNumber: string;
    education?: string | null;
    occupationType?: string | null;
    occupationDetail?: string | null;
    region?: string | null;
    religion?: string | null;
    caste?: string | null;
    isOurSupporter?: boolean | null;
    feedback?: string | null;
    influencerType?: string | null;
    vehicleType?: string | null;
    profiledBy: string;
  },
): Promise<VoterProfile> {
  const now = new Date().toISOString();
  const row = {
    epic_number: profileData.epicNumber,
    education: profileData.education || null,
    occupation_type: profileData.occupationType || null,
    occupation_detail: profileData.occupationDetail || null,
    region: profileData.region || null,
    religion: profileData.religion || null,
    caste: profileData.caste || null,
    is_our_supporter: profileData.isOurSupporter ?? null,
    feedback: profileData.feedback || null,
    influencer_type: profileData.influencerType || null,
    vehicle_type: profileData.vehicleType || null,
    is_profiled: true,
    profiled_at: now,
    profiled_by: profileData.profiledBy,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from(TABLES.voterProfile)
    .upsert(row, { onConflict: 'epic_number' })
    .select('*')
    .single();
  throwOnSupabaseError(error, 'Failed to save voter profile');
  return mapVoterProfileRow(data);
}

export async function bulkSaveFieldVisitorFamilyProfiles(
  members: Array<{
    epicNumber: string;
    education?: string | null;
    occupationType?: string | null;
    occupationDetail?: string | null;
    region?: string | null;
    isOurSupporter?: boolean | null;
    influencerType?: string | null;
    vehicleType?: string | null;
    profiledBy: string;
  }>,
): Promise<VoterProfile[]> {
  const results: VoterProfile[] = [];
  for (const member of members) {
    if (!member.epicNumber) continue;
    const [voter] = await pgSql`
      SELECT epic_number FROM "VoterMaster" WHERE epic_number = ${member.epicNumber} LIMIT 1
    `;
    if (!voter) continue;
    const profile = await saveFieldVisitorProfile(member);
    results.push(profile);
  }
  return results;
}

export async function getFieldVisitorAssignments({
  userId,
  electionId,
}: {
  userId: string;
  electionId?: string | null;
}): Promise<{ assignments: Array<Record<string, unknown>>; electionId: string | null }> {
  let targetElectionId = electionId;
  if (!targetElectionId) {
    const [userLatestElection] = await pgSql`
      SELECT upa.election_id
      FROM "UserPartAssignment" upa
      INNER JOIN "ElectionMaster" em ON upa.election_id = em.election_id
      WHERE upa.user_id = ${userId}
      ORDER BY em.year DESC
      LIMIT 1
    `;
    if (!userLatestElection) {
      return { assignments: [], electionId: null };
    }
    targetElectionId = String(userLatestElection.election_id);
  }

  const rows = await pgSql`
    SELECT
      upa.id,
      upa.booth_no,
      upa.election_id,
      bm.booth_name,
      bm.booth_address,
      upa.created_at
    FROM "UserPartAssignment" upa
    LEFT JOIN "BoothMaster" bm
      ON upa.election_id = bm.election_id AND upa.booth_no = bm.booth_no
    WHERE upa.user_id = ${userId} AND upa.election_id = ${targetElectionId}
  `;

  return {
    assignments: rows.map((row) => ({
      id: String(row.id),
      boothNo: String(row.booth_no),
      electionId: String(row.election_id),
      boothName: row.booth_name != null ? String(row.booth_name) : null,
      boothAddress: row.booth_address != null ? String(row.booth_address) : null,
      createdAt: row.created_at,
    })),
    electionId: targetElectionId,
  };
}

// ---------------------------------------------------------------------------
// Ward / religion / voting-participation / dashboard helpers
// ---------------------------------------------------------------------------

function normalizeWardKey(wardNo: string): string {
  return String(wardNo).trim().replace(/^0+(?=\d)/, '');
}

/**
 * Distinct BMC wards from the ElectionMapping-derived booth→ward map
 * (same source as Form 20), optionally filtered to the ward for one booth/part.
 */
export async function getDistinctWards(boothNo?: string | null): Promise<string[]> {
  if (boothNo) {
    const ward = await getWardForPart(boothNo);
    return ward ? [ward] : [];
  }

  const map = await getBoothWardMap();
  return Array.from(map.partsByWard.keys()).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
}

/**
 * Ward→part mapping from ElectionMapping (Form 20 booth→ward map).
 * When wardNos is empty, returns the full mapping so UI can nest parts under wards.
 * `electionId` is kept for API compatibility; BoothMaster supplements allParts.
 */
export async function getPartsByWards(
  wardNos: string[],
  electionId: string,
): Promise<{ partsByWard: Record<string, string[]>; allParts: string[] }> {
  const map = await getBoothWardMap();
  const partsByWard: Record<string, string[]> = {};
  const allPartsSet = new Set<string>();

  for (const booth of map.boothToWard.keys()) {
    allPartsSet.add(booth);
  }

  const targetWards =
    wardNos.length > 0
      ? wardNos.map(normalizeWardKey)
      : Array.from(map.partsByWard.keys());

  for (const ward of targetWards) {
    const parts = map.partsByWard.get(ward) ?? [];
    partsByWard[ward] = [...parts];
    for (const part of parts) allPartsSet.add(part);
  }

  // Preserve original request keys when callers pass un-normalized ward nos
  for (const raw of wardNos) {
    const key = normalizeWardKey(raw);
    if (raw !== key && partsByWard[key] && !partsByWard[raw]) {
      partsByWard[raw] = partsByWard[key];
    }
  }

  const boothRows = await pgSql`
    SELECT booth_no FROM "BoothMaster"
    WHERE election_id = ${electionId}
    ORDER BY booth_no ASC
  `;
  for (const row of boothRows) {
    if (!row.booth_no) continue;
    const raw = String(row.booth_no);
    allPartsSet.add(raw);
    const normalized = normalizePartNo(raw);
    if (normalized && normalized !== raw) allPartsSet.add(normalized);
  }

  const allParts = Array.from(allPartsSet).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );

  return { partsByWard, allParts };
}

export async function getDistinctReligions(): Promise<string[]> {
  const rows = await pgSql`
    SELECT religion FROM "VoterMaster"
    WHERE religion IS NOT NULL
    GROUP BY religion
    ORDER BY religion ASC
  `;
  return rows
    .map((r) => (r.religion != null ? String(r.religion) : null))
    .filter((religion): religion is string => religion !== null && religion.trim() !== '');
}

export async function getVotingParticipationParts(electionId: string): Promise<string[]> {
  const rows = await pgSql`
    SELECT booth_no FROM "BoothMaster"
    WHERE election_id = ${electionId}
    ORDER BY booth_no ASC
  `;
  return rows.map((row) => String(row.booth_no));
}

// ---------------------------------------------------------------------------
// Admin user part assignments
// ---------------------------------------------------------------------------

export async function getLatestElectionId(): Promise<string | null> {
  const [row] = await pgSql`
    SELECT election_id FROM "ElectionMaster"
    ORDER BY year DESC
    LIMIT 1
  `;
  return row ? String(row.election_id) : null;
}

export async function getAdminUserPartAssignments({
  userId,
  electionId,
}: {
  userId: string;
  electionId?: string | null;
}): Promise<{
  assignments: Array<{
    id: string;
    boothNo: string;
    electionId: string;
    boothName: string | null;
    boothAddress: string | null;
    createdAt: unknown;
  }>;
  availableBooths: Array<{ boothNo: string; boothName: string | null }>;
  electionId: string | null;
}> {
  let targetElectionId = electionId ?? null;
  if (!targetElectionId) {
    targetElectionId = await getLatestElectionId();
  }

  const assignmentRows = targetElectionId
    ? await pgSql`
        SELECT
          upa.id,
          upa.booth_no,
          upa.election_id,
          bm.booth_name,
          bm.booth_address,
          upa.created_at
        FROM "UserPartAssignment" upa
        LEFT JOIN "BoothMaster" bm
          ON upa.election_id = bm.election_id AND upa.booth_no = bm.booth_no
        WHERE upa.user_id = ${userId} AND upa.election_id = ${targetElectionId}
      `
    : await pgSql`
        SELECT
          upa.id,
          upa.booth_no,
          upa.election_id,
          bm.booth_name,
          bm.booth_address,
          upa.created_at
        FROM "UserPartAssignment" upa
        LEFT JOIN "BoothMaster" bm
          ON upa.election_id = bm.election_id AND upa.booth_no = bm.booth_no
        WHERE upa.user_id = ${userId}
      `;

  let availableBooths: Array<{ boothNo: string; boothName: string | null }> = [];
  if (targetElectionId) {
    const boothRows = await pgSql`
      SELECT booth_no, booth_name FROM "BoothMaster"
      WHERE election_id = ${targetElectionId}
      ORDER BY booth_no ASC
    `;
    availableBooths = boothRows.map((row) => ({
      boothNo: String(row.booth_no),
      boothName: row.booth_name != null ? String(row.booth_name) : null,
    }));
  }

  return {
    assignments: assignmentRows.map((row) => ({
      id: String(row.id),
      boothNo: String(row.booth_no),
      electionId: String(row.election_id),
      boothName: row.booth_name != null ? String(row.booth_name) : null,
      boothAddress: row.booth_address != null ? String(row.booth_address) : null,
      createdAt: row.created_at,
    })),
    availableBooths,
    electionId: targetElectionId,
  };
}

export async function replaceUserPartAssignments({
  userId,
  electionId,
  boothNos,
}: {
  userId: string;
  electionId: string;
  boothNos: string[];
}): Promise<void> {
  const { error: deleteError } = await supabase
    .from(TABLES.userPartAssignment)
    .delete()
    .eq('user_id', userId)
    .eq('election_id', electionId);
  throwOnSupabaseError(deleteError, 'Failed to delete user part assignments');

  if (boothNos.length === 0) return;

  const now = new Date().toISOString();
  const { error: insertError } = await supabase.from(TABLES.userPartAssignment).insert(
    boothNos.map((boothNo) => ({
      user_id: userId,
      election_id: electionId,
      booth_no: boothNo,
      created_at: now,
      updated_at: now,
    })),
  );
  throwOnSupabaseError(insertError, 'Failed to insert user part assignments');
}

export async function deleteUserPartAssignment(assignmentId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLES.userPartAssignment)
    .delete()
    .eq('id', assignmentId);
  throwOnSupabaseError(error, 'Failed to delete user part assignment');
}

export async function updateUserDetails(
  id: string,
  updates: { userId?: string; roleId?: string | null; password?: string },
): Promise<User> {
  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (updates.userId) row.user_id = updates.userId;
  if (updates.roleId !== undefined) row.role_id = updates.roleId;
  if (updates.password) row.password = generateHashedPassword(updates.password);

  const { data, error } = await supabase
    .from(TABLES.user)
    .update(row)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  throwOnSupabaseError(error, 'Failed to update user');
  if (!data) {
    throw new ChatSDKError('bad_request:database', 'User not found');
  }
  return mapUserRow(data);
}

export async function getDashboardCounts(todayStr: string): Promise<{
  programmeItems: DailyProgramme[];
  programmeCount: number;
  inwardCount: number;
  outwardCount: number;
  projectsCount: number;
}> {
  const [programmeItems, programmeCountResult, inwardResult, outwardResult, projectsResult] =
    await Promise.all([
      pgSql`
      SELECT * FROM "DailyProgramme"
      WHERE date = ${todayStr}
      ORDER BY start_time ASC
      LIMIT 5
    `,
      pgSql`
      SELECT COUNT(*)::int AS count FROM "DailyProgramme"
      WHERE date = ${todayStr}
    `,
      pgSql`
      SELECT COUNT(*)::int AS count FROM "RegisterEntry"
      WHERE type = 'inward' AND date >= ${todayStr}
    `,
      pgSql`
      SELECT COUNT(*)::int AS count FROM "RegisterEntry"
      WHERE type = 'outward' AND date >= ${todayStr}
    `,
      pgSql`
      SELECT COUNT(*)::int AS count FROM "MlaProject"
      WHERE status = 'In Progress'
    `,
    ]);

  return {
    programmeItems: programmeItems.map(mapDailyProgrammeRow),
    programmeCount: Number(programmeCountResult[0]?.count) || 0,
    inwardCount: Number(inwardResult[0]?.count) || 0,
    outwardCount: Number(outwardResult[0]?.count) || 0,
    projectsCount: Number(projectsResult[0]?.count) || 0,
  };
}

// ─── ADM (Asset Development & Fund Management) ───────────────────────────────

export async function getAdmDashboard(): Promise<AdmFundingCategoryWithFunds[]> {
  try {
    const { data: categories, error: catError } = await supabase
      .from(TABLES.admFundingCategory)
      .select('*')
      .order('display_order', { ascending: true });
    throwOnSupabaseError(catError, 'Failed to get ADM categories');

    const { data: fundRows, error: fundError } = await supabase
      .from(TABLES.admFundRecord)
      .select('*')
      .order('financial_year', { ascending: false });
    throwOnSupabaseError(fundError, 'Failed to get ADM fund records');

    const { data: allocationRows, error: allocError } = await supabase
      .from(TABLES.admFundAllocation)
      .select('*')
      .order('created_at', { ascending: true });
    throwOnSupabaseError(allocError, 'Failed to get ADM allocations');

    const { data: documentRows, error: docError } = await supabase
      .from(TABLES.admDocument)
      .select('*')
      .order('created_at', { ascending: false });
    throwOnSupabaseError(docError, 'Failed to get ADM documents');

    const projectIds = [
      ...new Set(
        (allocationRows ?? []).map((row) => String(row.project_id ?? row.projectId)),
      ),
    ];

    const projectById = new Map<string, MlaProject>();
    if (projectIds.length > 0) {
      const { data: projects, error: projectError } = await supabase
        .from(TABLES.mlaProject)
        .select('*')
        .in('id', projectIds);
      throwOnSupabaseError(projectError, 'Failed to get linked projects');
      for (const project of projects ?? []) {
        const mapped = mapMlaProjectRow(project);
        projectById.set(mapped.id, mapped);
      }
    }

    const wardGeoIds = [
      ...new Set(
        [...projectById.values()]
          .map((p) => p.wardGeoId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const wardGeoNameById = new Map<string, string>();
    if (wardGeoIds.length > 0) {
      const { data: geoRows, error: geoError } = await supabase
        .from(TABLES.cadreGeographicUnit)
        .select('id, name')
        .in('id', wardGeoIds);
      throwOnSupabaseError(geoError, 'Failed to get project ward geo units');
      for (const row of geoRows ?? []) {
        wardGeoNameById.set(String(row.id), String(row.name));
      }
    }

    const beforePhotosByProject = new Map<
      string,
      Array<{ id: string; fileUrl: string; fileName: string }>
    >();
    const afterPhotosByProject = new Map<
      string,
      Array<{ id: string; fileUrl: string; fileName: string }>
    >();
    if (projectIds.length > 0) {
      const { data: mediaRows, error: mediaError } = await supabase
        .from(TABLES.projectGroundMedia)
        .select('id, project_id, photo_type, file_url, file_name, sort_order, created_at')
        .in('project_id', projectIds)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      throwOnSupabaseError(mediaError, 'Failed to get project ground media');
      for (const row of mediaRows ?? []) {
        const projectId = String(row.project_id);
        const photo = {
          id: String(row.id),
          fileUrl: String(row.file_url),
          fileName: String(row.file_name ?? ''),
        };
        const photoType = String(row.photo_type);
        if (photoType === 'after') {
          const list = afterPhotosByProject.get(projectId) ?? [];
          list.push(photo);
          afterPhotosByProject.set(projectId, list);
        } else if (photoType === 'before') {
          const list = beforePhotosByProject.get(projectId) ?? [];
          list.push(photo);
          beforePhotosByProject.set(projectId, list);
        }
      }
    }

    const allocationsByFund = new Map<string, AdmFundAllocationWithProject[]>();
    for (const row of allocationRows ?? []) {
      const allocation = mapAdmFundAllocationRow(row);
      const project = projectById.get(allocation.projectId);
      const enriched: AdmFundAllocationWithProject = {
        ...allocation,
        projectName: project?.name ?? 'Unknown project',
        projectDepartment: project?.department ?? null,
        projectCategory: project?.category ?? null,
        projectTaluka: project?.taluka ?? null,
        projectVillage: project?.village ?? null,
        projectWard: project?.ward ?? null,
        projectWardGeoId: project?.wardGeoId ?? null,
        projectBoothNo: project?.boothNo ?? null,
        projectWardGeoName: project?.wardGeoId
          ? (wardGeoNameById.get(project.wardGeoId) ?? null)
          : null,
        projectPhysicalStatus: project?.physicalStatus ?? 'WNS',
        projectEstimatedCost: project?.estimatedCost ?? 0,
        projectApprovalStatus: project?.approvalStatus ?? 'Pending',
        projectBeforePhotos:
          beforePhotosByProject.get(allocation.projectId) ?? [],
        projectAfterPhotos:
          afterPhotosByProject.get(allocation.projectId) ?? [],
      };
      const list = allocationsByFund.get(allocation.fundRecordId) ?? [];
      list.push(enriched);
      allocationsByFund.set(allocation.fundRecordId, list);
    }

    for (const [, list] of allocationsByFund) {
      list.sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
    }

    const mappedDocs = (documentRows ?? []).map(mapAdmDocumentRow);
    const enrichedDocs = await enrichAdmDocumentsWithRegister(mappedDocs);
    const documentsByFund = new Map<string, AdmDocument[]>();
    for (const doc of enrichedDocs) {
      const list = documentsByFund.get(doc.fundRecordId) ?? [];
      list.push(doc);
      documentsByFund.set(doc.fundRecordId, list);
    }

    const categoryById = new Map(
      (categories ?? []).map((row) => {
        const category = mapAdmFundingCategoryRow(row);
        return [category.id, category] as const;
      }),
    );

    const fundsByCategory = new Map<string, AdmFundRecordWithDetails[]>();
    for (const row of fundRows ?? []) {
      const fund = mapAdmFundRecordRow(row);
      const category = categoryById.get(fund.categoryId);
      const allocations = allocationsByFund.get(fund.id) ?? [];
      const documents = documentsByFund.get(fund.id) ?? [];
      const allocatedBudget = allocations.reduce(
        (sum, a) => sum + a.allocatedBudget,
        0,
      );
      const detailed: AdmFundRecordWithDetails = {
        ...fund,
        categoryName: category?.name ?? 'Unknown',
        categoryCode: category?.code ?? '',
        allocations,
        documents,
        allocatedBudget,
      };
      const list = fundsByCategory.get(fund.categoryId) ?? [];
      list.push(detailed);
      fundsByCategory.set(fund.categoryId, list);
    }

    return (categories ?? []).map((row) => {
      const category = mapAdmFundingCategoryRow(row);
      const fundRecords = fundsByCategory.get(category.id) ?? [];
      const allocatedBudget = fundRecords.reduce(
        (sum, f) => sum + f.allocatedBudget,
        0,
      );
      const totalBudget = fundRecords.reduce((sum, f) => sum + f.budget, 0);
      return {
        ...category,
        fundRecords,
        allocatedBudget,
        totalBudget,
      };
    });
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get ADM dashboard');
  }
}

function toAdmCategoryCode(name: string): string {
  const slug = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 16);
  return slug || 'CUSTOM';
}

export async function findAdmFundingCategoryByName(
  name: string,
): Promise<AdmFundingCategory | null> {
  try {
    const trimmed = name.trim();
    if (!trimmed) return null;

    const { data, error } = await supabase
      .from(TABLES.admFundingCategory)
      .select('*')
      .ilike('name', trimmed)
      .limit(1)
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to find ADM funding category');
    return data ? mapAdmFundingCategoryRow(data) : null;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to find ADM funding category',
    );
  }
}

export async function createAdmFundingCategory({
  name,
}: {
  name: string;
}): Promise<AdmFundingCategory> {
  try {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new ChatSDKError('bad_request:database', 'Fund type name is required');
    }

    const existing = await findAdmFundingCategoryByName(trimmed);
    if (existing) return existing;

    const { data: orderRows, error: orderError } = await supabase
      .from(TABLES.admFundingCategory)
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1);
    throwOnSupabaseError(orderError, 'Failed to get ADM category order');

    const nextOrder = Number(orderRows?.[0]?.display_order ?? 0) + 1;

    const now = new Date().toISOString();
    const baseCode = toAdmCategoryCode(trimmed);

    for (let attempt = 0; attempt < 5; attempt++) {
      const code =
        attempt === 0
          ? baseCode.slice(0, 20)
          : `${baseCode.slice(0, 16)}-${attempt + 1}`.slice(0, 20);

      const { data, error } = await supabase
        .from(TABLES.admFundingCategory)
        .insert(
          toSnakeCaseKeys({
            code,
            name: trimmed,
            displayOrder: nextOrder,
            createdAt: now,
            updatedAt: now,
          }),
        )
        .select('*')
        .single();

      if (!error && data) {
        return mapAdmFundingCategoryRow(data);
      }

      const isUniqueViolation =
        error?.code === '23505' ||
        String(error?.message ?? '').toLowerCase().includes('duplicate');
      if (!isUniqueViolation) {
        throwOnSupabaseError(error, 'Failed to create ADM funding category');
      }
    }

    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create ADM funding category',
    );
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create ADM funding category',
    );
  }
}

export async function getAdmFundRecordById(
  id: string,
): Promise<AdmFundRecord | null> {
  try {
    const { data, error } = await supabase
      .from(TABLES.admFundRecord)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to get ADM fund record');
    return data ? mapAdmFundRecordRow(data) : null;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get ADM fund record');
  }
}

export async function createAdmFundRecord({
  categoryId,
  financialYear,
  projectYear,
  batchLabel = '',
  budget,
}: {
  categoryId: string;
  financialYear: string;
  projectYear: string;
  batchLabel?: string;
  budget: number;
}): Promise<AdmFundRecord> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(TABLES.admFundRecord)
      .insert(
        toSnakeCaseKeys({
          categoryId,
          financialYear,
          projectYear,
          batchLabel: batchLabel.trim(),
          budget,
          createdAt: now,
          updatedAt: now,
        }),
      )
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to create ADM fund record');
    return mapAdmFundRecordRow(data);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to create ADM fund record');
  }
}

export async function updateAdmFundRecord(
  id: string,
  data: Partial<
    Pick<AdmFundRecord, 'financialYear' | 'projectYear' | 'batchLabel' | 'budget'>
  >,
): Promise<AdmFundRecord | null> {
  try {
    const snakePatch = toSnakeCaseKeys({
      ...data,
      updatedAt: new Date().toISOString(),
    });
    const { data: updated, error } = await supabase
      .from(TABLES.admFundRecord)
      .update(snakePatch)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to update ADM fund record');
    return updated ? mapAdmFundRecordRow(updated) : null;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to update ADM fund record');
  }
}

export async function deleteAdmFundRecord(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(TABLES.admFundRecord)
      .delete()
      .eq('id', id);
    throwOnSupabaseError(error, 'Failed to delete ADM fund record');
    return true;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to delete ADM fund record');
  }
}

export async function getAdmFundAllocationById(
  id: string,
): Promise<AdmFundAllocation | null> {
  try {
    const { data, error } = await supabase
      .from(TABLES.admFundAllocation)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to get ADM allocation');
    return data ? mapAdmFundAllocationRow(data) : null;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get ADM allocation');
  }
}

export async function getAdmAllocationsByProjectId(
  projectId: string,
): Promise<
  Array<
    AdmFundAllocation & {
      fundRecord: AdmFundRecord;
      categoryName: string;
      categoryCode: string;
    }
  >
> {
  try {
    const { data: allocations, error } = await supabase
      .from(TABLES.admFundAllocation)
      .select('*')
      .eq('project_id', projectId);
    throwOnSupabaseError(error, 'Failed to get project ADM allocations');

    if (!allocations?.length) return [];

    const fundIds = allocations.map((a) => String(a.fund_record_id));
    const { data: funds, error: fundError } = await supabase
      .from(TABLES.admFundRecord)
      .select('*')
      .in('id', fundIds);
    throwOnSupabaseError(fundError, 'Failed to get fund records for allocations');

    const fundById = new Map(
      (funds ?? []).map((f) => [String(f.id), mapAdmFundRecordRow(f)]),
    );
    const categoryIds = [
      ...new Set(Array.from(fundById.values()).map((f) => f.categoryId)),
    ];
    const { data: categories, error: catError } = await supabase
      .from(TABLES.admFundingCategory)
      .select('*')
      .in('id', categoryIds);
    throwOnSupabaseError(catError, 'Failed to get categories for allocations');

    const categoryById = new Map(
      (categories ?? []).map((c) => [String(c.id), mapAdmFundingCategoryRow(c)]),
    );

    return allocations.map((row) => {
      const allocation = mapAdmFundAllocationRow(row);
      const fundRecord = fundById.get(allocation.fundRecordId)!;
      const category = categoryById.get(fundRecord.categoryId);
      return {
        ...allocation,
        fundRecord,
        categoryName: category?.name ?? '',
        categoryCode: category?.code ?? '',
      };
    });
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get project ADM allocations',
    );
  }
}

export async function createAdmFundAllocation({
  fundRecordId,
  projectId,
  allocatedBudget,
  createdBy,
  workCode,
  sortOrder,
  mlaRecommendationRef,
  technicalSanctionRef,
  technicalSanctionDate,
  technicalSanctionAmount,
  governmentFixedAmount,
}: {
  fundRecordId: string;
  projectId: string;
  allocatedBudget: number;
  createdBy: string;
  workCode?: string | null;
  sortOrder?: number;
  mlaRecommendationRef?: string | null;
  technicalSanctionRef?: string | null;
  technicalSanctionDate?: string | null;
  technicalSanctionAmount?: number;
  governmentFixedAmount?: number;
}): Promise<AdmFundAllocation> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(TABLES.admFundAllocation)
      .insert(
        toSnakeCaseKeys({
          fundRecordId,
          projectId,
          allocatedBudget,
          workCode: workCode ?? null,
          sortOrder: sortOrder ?? 0,
          mlaRecommendationRef: mlaRecommendationRef ?? null,
          technicalSanctionRef: technicalSanctionRef ?? null,
          technicalSanctionDate: technicalSanctionDate ?? null,
          technicalSanctionAmount: technicalSanctionAmount ?? 0,
          governmentFixedAmount: governmentFixedAmount ?? 0,
          createdBy,
          createdAt: now,
          updatedAt: now,
        }),
      )
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to create ADM allocation');
    return mapAdmFundAllocationRow(data);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to create ADM allocation');
  }
}

export async function updateAdmFundAllocation(
  id: string,
  data: Partial<
    Pick<
      AdmFundAllocation,
      | 'allocatedBudget'
      | 'projectId'
      | 'workCode'
      | 'sortOrder'
      | 'mlaRecommendationRef'
      | 'technicalSanctionRef'
      | 'technicalSanctionDate'
      | 'technicalSanctionAmount'
      | 'governmentFixedAmount'
    >
  >,
): Promise<AdmFundAllocation | null> {
  try {
    const snakePatch = toSnakeCaseKeys({
      ...data,
      updatedAt: new Date().toISOString(),
    });
    const { data: updated, error } = await supabase
      .from(TABLES.admFundAllocation)
      .update(snakePatch)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to update ADM allocation');
    return updated ? mapAdmFundAllocationRow(updated) : null;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to update ADM allocation');
  }
}

export async function deleteAdmFundAllocation(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(TABLES.admFundAllocation)
      .delete()
      .eq('id', id);
    throwOnSupabaseError(error, 'Failed to delete ADM allocation');
    return true;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to delete ADM allocation');
  }
}

export async function createAdmDocument({
  fundRecordId,
  registerEntryId,
  amountUnit = 'rupees',
  fileName,
  fileSizeKb,
  fileUrl,
  kind,
  label,
  uploadedBy,
}: {
  fundRecordId: string;
  /** When set, file metadata is taken from the inward register attachment. */
  registerEntryId?: string | null;
  amountUnit?: AdmAmountUnit;
  fileName?: string | null;
  fileSizeKb?: number;
  fileUrl?: string | null;
  kind?: string;
  label?: string | null;
  uploadedBy: string;
}): Promise<AdmDocument> {
  try {
    let resolvedFileName = fileName ?? null;
    let resolvedFileSizeKb = fileSizeKb ?? 0;
    let resolvedFileUrl = fileUrl ?? null;
    let resolvedRegisterEntryId = registerEntryId ?? null;

    if (registerEntryId) {
      const entry = await getRegisterEntryById(registerEntryId);
      if (!entry || entry.type !== 'inward') {
        throw new ChatSDKError(
          'bad_request:database',
          'Inward register entry is required',
        );
      }

      const attachments = await getRegisterAttachments(registerEntryId);
      const primary = attachments[0] ?? null;
      resolvedRegisterEntryId = registerEntryId;
      resolvedFileName = primary?.fileName ?? resolvedFileName;
      resolvedFileSizeKb = primary?.fileSizeKb ?? resolvedFileSizeKb;
      resolvedFileUrl = primary?.fileUrl ?? resolvedFileUrl;
    }

    if (!resolvedFileName && !resolvedFileUrl) {
      throw new ChatSDKError(
        'bad_request:database',
        'Document file or inward register entry is required',
      );
    }

    const { data, error } = await supabase
      .from(TABLES.admDocument)
      .insert(
        toSnakeCaseKeys({
          fundRecordId,
          registerEntryId: resolvedRegisterEntryId,
          amountUnit,
          fileName: resolvedFileName,
          fileSizeKb: resolvedFileSizeKb,
          fileUrl: resolvedFileUrl,
          kind: kind ?? (resolvedRegisterEntryId ? 'sanction_order' : 'general'),
          label: label ?? null,
          uploadedBy,
          createdAt: new Date().toISOString(),
        }),
      )
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to create ADM document');
    const docs = await enrichAdmDocumentsWithRegister([mapAdmDocumentRow(data)]);
    return docs[0];
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to create ADM document');
  }
}

export async function updateAdmDocument(
  id: string,
  data: Partial<Pick<AdmDocument, 'amountUnit' | 'kind' | 'label'>>,
): Promise<AdmDocument | null> {
  try {
    const snakePatch = toSnakeCaseKeys(data);
    const { data: updated, error } = await supabase
      .from(TABLES.admDocument)
      .update(snakePatch)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to update ADM document');
    if (!updated) return null;
    const docs = await enrichAdmDocumentsWithRegister([
      mapAdmDocumentRow(updated),
    ]);
    return docs[0];
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to update ADM document');
  }
}

async function enrichAdmDocumentsWithRegister(
  docs: AdmDocument[],
): Promise<AdmDocument[]> {
  const registerIds = [
    ...new Set(
      docs
        .map((d) => d.registerEntryId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (registerIds.length === 0) return docs;

  const { data: entries, error: entryError } = await supabase
    .from(TABLES.registerEntry)
    .select('*')
    .in('id', registerIds);
  throwOnSupabaseError(entryError, 'Failed to get register entries for ADM docs');

  const { data: attachments, error: attachError } = await supabase
    .from(TABLES.registerAttachment)
    .select('*')
    .in('entry_id', registerIds)
    .order('created_at', { ascending: true });
  throwOnSupabaseError(
    attachError,
    'Failed to get register attachments for ADM docs',
  );

  const entryById = new Map(
    (entries ?? []).map((row) => {
      const mapped = mapRegisterEntryRow(row);
      return [mapped.id, mapped] as const;
    }),
  );
  const firstAttachmentByEntry = new Map<string, RegisterAttachment>();
  for (const row of attachments ?? []) {
    const mapped = mapRegisterAttachmentRow(row);
    if (!firstAttachmentByEntry.has(mapped.entryId)) {
      firstAttachmentByEntry.set(mapped.entryId, mapped);
    }
  }

  return docs.map((doc) => {
    if (!doc.registerEntryId) return doc;
    const entry = entryById.get(doc.registerEntryId);
    const attachment = firstAttachmentByEntry.get(doc.registerEntryId);
    return {
      ...doc,
      registerRefNo: entry?.refNo ?? null,
      registerSubject: entry?.subject ?? null,
      registerDate: entry?.date ?? null,
      registerFromTo: entry?.fromTo ?? null,
      registerDocumentType: entry?.documentType ?? null,
      attachmentFileUrl: attachment?.fileUrl ?? doc.fileUrl,
      attachmentFileName: attachment?.fileName ?? doc.fileName,
      fileUrl: attachment?.fileUrl ?? doc.fileUrl,
      fileName: attachment?.fileName ?? doc.fileName,
      fileSizeKb: attachment?.fileSizeKb ?? doc.fileSizeKb,
    };
  });
}

export async function getAdmDocumentsByFundRecordId(
  fundRecordId: string,
): Promise<AdmDocument[]> {
  try {
    const { data, error } = await supabase
      .from(TABLES.admDocument)
      .select('*')
      .eq('fund_record_id', fundRecordId)
      .order('created_at', { ascending: false });
    throwOnSupabaseError(error, 'Failed to get ADM documents');
    return enrichAdmDocumentsWithRegister((data ?? []).map(mapAdmDocumentRow));
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get ADM documents');
  }
}

export async function getAdmDocumentById(
  id: string,
): Promise<AdmDocument | null> {
  try {
    const { data, error } = await supabase
      .from(TABLES.admDocument)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to get ADM document');
    return data ? mapAdmDocumentRow(data) : null;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get ADM document');
  }
}

export async function deleteAdmDocument(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from(TABLES.admDocument).delete().eq('id', id);
    throwOnSupabaseError(error, 'Failed to delete ADM document');
    return true;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to delete ADM document');
  }
}

// ─── Project documents & ground media ────────────────────────────────────────

export async function getProjectAttachments(
  projectId: string,
): Promise<ProjectAttachment[]> {
  try {
    const { data, error } = await supabase
      .from(TABLES.projectAttachment)
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    throwOnSupabaseError(error, 'Failed to get project attachments');
    return (data ?? []).map(mapProjectAttachmentRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get project attachments');
  }
}

export async function createProjectAttachment({
  projectId,
  fileName,
  fileSizeKb,
  fileUrl,
  documentKind,
  version,
  versionGroupId,
  uploadedBy,
}: {
  projectId: string;
  fileName: string;
  fileSizeKb: number;
  fileUrl: string | null;
  documentKind: ProjectDocumentKind;
  version: number;
  versionGroupId: string;
  uploadedBy: string;
}): Promise<ProjectAttachment> {
  try {
    const { data, error } = await supabase
      .from(TABLES.projectAttachment)
      .insert(
        toSnakeCaseKeys({
          projectId,
          fileName,
          fileSizeKb,
          fileUrl,
          documentKind,
          version,
          versionGroupId,
          uploadedBy,
          createdAt: new Date().toISOString(),
        }),
      )
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to create project attachment');
    return mapProjectAttachmentRow(data);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create project attachment',
    );
  }
}

export async function getProjectAttachmentById(
  id: string,
): Promise<ProjectAttachment | null> {
  try {
    const { data, error } = await supabase
      .from(TABLES.projectAttachment)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to get project attachment');
    return data ? mapProjectAttachmentRow(data) : null;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get project attachment');
  }
}

export async function getLatestProjectAttachmentVersion(
  versionGroupId: string,
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from(TABLES.projectAttachment)
      .select('version')
      .eq('version_group_id', versionGroupId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to get attachment version');
    return data ? Number(data.version) : 0;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get attachment version',
    );
  }
}

export async function deleteProjectAttachment(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(TABLES.projectAttachment)
      .delete()
      .eq('id', id);
    throwOnSupabaseError(error, 'Failed to delete project attachment');
    return true;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete project attachment',
    );
  }
}

export async function getProjectGroundMedia(
  projectId: string,
): Promise<ProjectGroundMedia[]> {
  try {
    const { data, error } = await supabase
      .from(TABLES.projectGroundMedia)
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    throwOnSupabaseError(error, 'Failed to get project ground media');
    return (data ?? []).map(mapProjectGroundMediaRow);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get project ground media');
  }
}

export async function createProjectGroundMedia({
  projectId,
  photoType,
  fileUrl,
  fileName,
  sortOrder,
}: {
  projectId: string;
  photoType: 'before' | 'after';
  fileUrl: string;
  fileName: string;
  sortOrder?: number;
}): Promise<ProjectGroundMedia> {
  try {
    const { data, error } = await supabase
      .from(TABLES.projectGroundMedia)
      .insert(
        toSnakeCaseKeys({
          projectId,
          photoType,
          fileUrl,
          fileName,
          sortOrder: sortOrder ?? 0,
          createdAt: new Date().toISOString(),
        }),
      )
      .select('*')
      .single();
    throwOnSupabaseError(error, 'Failed to create project ground media');
    return mapProjectGroundMediaRow(data);
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create project ground media',
    );
  }
}

export async function getProjectGroundMediaById(
  id: string,
): Promise<ProjectGroundMedia | null> {
  try {
    const { data, error } = await supabase
      .from(TABLES.projectGroundMedia)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to get project ground media');
    return data ? mapProjectGroundMediaRow(data) : null;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:database', 'Failed to get project ground media');
  }
}

export async function deleteProjectGroundMedia(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(TABLES.projectGroundMedia)
      .delete()
      .eq('id', id);
    throwOnSupabaseError(error, 'Failed to delete project ground media');
    return true;
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete project ground media',
    );
  }
}

