import 'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  message,
  vote,
  type DBMessage,
  type Chat,
  stream,
  Voters,
  type Voter,
  type VoterWithPartNo,
  VoterMaster,
  type VoterMaster as VoterMasterType,
  ElectionMaster,
  type ElectionMaster as ElectionMasterType,
  BoothMaster,
  type BoothMaster as BoothMasterType,
  ElectionMapping,
  type ElectionMapping as ElectionMappingType,
  PartNo,
  type PartNoType,
  beneficiaryServices,
  type BeneficiaryService,
  voterTasks,
  type VoterTask,
  communityServiceAreas,
  type CommunityServiceArea,
  taskHistory,
  type TaskHistory,
  userModulePermissions,
  type UserModulePermission,
  dailyProgramme,
  type DailyProgramme,
  dailyProgrammeAttachment,
  type DailyProgrammeAttachment,
  mlaProject,
  type MlaProject,
  registerEntry,
  type RegisterEntry,
  registerAttachment,
  type RegisterAttachment,
  role,
  type Role,
  roleModulePermissions,
  type RoleModulePermission,
  visitor,
  type Visitor,
  exportJob,
  type ExportJob,
  phoneUpdateHistory,
  type PhoneUpdateHistory,
  voterMobileNumber,
  type VoterMobileNumber,
} from './schema';
import { generateHashedPassword } from './utils';
import type { VisibilityType } from '@/components/visibility-selector';
import type { ArtifactKind } from '@/components/artifact';
import { ChatSDKError } from '../errors';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
export const db = drizzle(client);

export async function getUser(userIdValue: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.userId, userIdValue));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get user by userId',
    );
  }
}

export async function createUser(userIdValue: string, password: string, roleId?: string | null) {
  const hashedPassword = generateHashedPassword(password);

  try {
    console.log('Creating user with:', { userId: userIdValue, roleId });
    const result = await db.insert(user).values({ userId: userIdValue, password: hashedPassword, roleId: roleId || null });
    console.log('User created successfully:', result);
    return result;
  } catch (error) {
    console.error('Create user error:', error);
    throw new ChatSDKError('bad_request:database', 'Failed to create user');
  }
}

// Deprecated: Use updateUserRoleId instead
// This function is kept for backward compatibility but does nothing
export async function updateUserRole(userId: string, _role: never) {
  console.warn('updateUserRole is deprecated. Use updateUserRoleId instead.');
  throw new ChatSDKError('bad_request:database', 'updateUserRole is deprecated. Use updateUserRoleId instead.');
}

export async function updateUserRoleId(userId: string, roleId: string | null) {
  try {
    return await db.update(user).set({ roleId, updatedAt: new Date() }).where(eq(user.id, userId));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update user roleId');
  }
}

export async function getUserById(userId: string): Promise<User | null> {
  try {
    const [userRecord] = await db.select().from(user).where(eq(user.id, userId));
    return userRecord || null;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get user by id');
  }
}

export async function getAllUsers(): Promise<Array<User>> {
  try {
    return await db.select().from(user).orderBy(asc(user.userId));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get all users');
  }
}

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
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save chat');
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete chat by id',
    );
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

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id),
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Array<Chat> = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${startingAfter} not found`,
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${endingBefore} not found`,
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get chats by user id',
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get chat by id');
  }
}

export async function saveMessages({
  messages,
}: {
  messages: Array<DBMessage>;
}) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save messages');
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get messages by chat id',
    );
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
    // First, validate that the message exists and belongs to the chat
    const [existingMessage] = await db
      .select()
      .from(message)
      .where(and(eq(message.id, messageId), eq(message.chatId, chatId)))
      .limit(1);

    if (!existingMessage) {
      throw new ChatSDKError('not_found:vote', 'Message not found in this chat');
    }

    // Check for existing vote using both chatId and messageId (composite primary key)
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)))
      .limit(1);

    if (existingVote) {
      // Update existing vote
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }

    // Insert new vote
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    // If it's already a ChatSDKError, re-throw it
    if (error instanceof ChatSDKError) {
      throw error;
    }
    // Otherwise, wrap in a generic database error
    throw new ChatSDKError('bad_request:database', 'Failed to vote message');
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get votes by chat id',
    );
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
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save document');
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get documents by id',
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get document by id',
    );
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
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete documents by id after timestamp',
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to save suggestions',
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get suggestions by document id',
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message by id',
    );
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
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
        );
    }
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete messages by chat id after timestamp',
    );
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
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update chat visibility by id',
    );
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: { id: string; differenceInHours: number }) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000,
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, 'user'),
        ),
      )
      .execute();

    return stats?.count ?? 0;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message count by user id',
    );
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
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create stream id',
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get stream ids by chat id',
    );
  }
}

// Helper function to get current/active election ID
// Defaults to '172LS2024' but can be configured via environment variable or settings
export async function getCurrentElectionId(): Promise<string> {
  // In the future, this could query a settings table
  // For now, default to 172LS2024 (Lok Sabha 2024 DOM)
  return process.env.CURRENT_ELECTION_ID || '172LS2024';
}

// Extended type that includes election mapping and voting history
export type VoterWithElectionData = VoterMasterType & {
  electionMapping?: ElectionMappingType | null;
  wardNo?: string | null;
  boothName?: string | null;
  englishBoothAddress?: string | null;
};

// Helper function to get voter with current election mapping
async function getVoterWithCurrentElection(
  epicNumber: string,
  electionId?: string
): Promise<VoterWithElectionData | null> {
  const currentElectionId = electionId || await getCurrentElectionId();

  const results = await db
    .select({
      // VoterMaster fields
      epicNumber: VoterMaster.epicNumber,
      fullName: VoterMaster.fullName,
      relationType: VoterMaster.relationType,
      relationName: VoterMaster.relationName,
      familyGrouping: VoterMaster.familyGrouping,
      houseNumber: VoterMaster.houseNumber,
      religion: VoterMaster.religion,
      caste: VoterMaster.caste,
      age: VoterMaster.age,
      dob: VoterMaster.dob,
      gender: VoterMaster.gender,
      mobileNoPrimary: VoterMaster.mobileNoPrimary,
      mobileNoSecondary: VoterMaster.mobileNoSecondary,
      address: VoterMaster.address,
      localityStreet: VoterMaster.localityStreet,
      townVillage: VoterMaster.townVillage,
      pincode: VoterMaster.pincode,
      createdAt: VoterMaster.createdAt,
      updatedAt: VoterMaster.updatedAt,
      // ElectionMapping fields
      electionMapping: {
        epicNumber: ElectionMapping.epicNumber,
        electionId: ElectionMapping.electionId,
        boothNo: ElectionMapping.boothNo,
        srNo: ElectionMapping.srNo,
      },
      // ElectionMaster fields (from join)
      electionType: ElectionMaster.electionType,
      year: ElectionMaster.year,
      delimitationVersion: ElectionMaster.delimitationVersion,
      dataSource: ElectionMaster.dataSource,
      constituencyType: ElectionMaster.constituencyType,
      constituencyId: ElectionMaster.constituencyId,
      // BoothMaster fields (from join)
      acNo: BoothMaster.acNo,
      wardNo: BoothMaster.wardNo,
      boothName: BoothMaster.boothName,
      boothAddress: BoothMaster.boothAddress,
      // PartNo fields (from join with PartNo table if partNo exists) - fallback if booth not in BoothMaster
      partNoWardNo: PartNo.wardNo,
      partNoBoothName: PartNo.boothName,
      englishBoothAddress: PartNo.englishBoothAddress,
      // hasVoted from ElectionMapping
      hasVoted: ElectionMapping.hasVoted,
    })
    .from(VoterMaster)
    .leftJoin(
      ElectionMapping,
      and(
        eq(VoterMaster.epicNumber, ElectionMapping.epicNumber),
        eq(ElectionMapping.electionId, currentElectionId)
      )
    )
    .leftJoin(
      ElectionMaster,
      eq(ElectionMapping.electionId, ElectionMaster.electionId)
    )
    .leftJoin(
      BoothMaster,
      and(
        eq(ElectionMapping.electionId, BoothMaster.electionId),
        eq(ElectionMapping.boothNo, BoothMaster.boothNo)
      )
    )
    .leftJoin(PartNo, eq(ElectionMapping.boothNo, PartNo.partNo))
    .where(eq(VoterMaster.epicNumber, epicNumber))
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  const result = results[0];
  return {
    ...result,
    electionMapping: result.electionMapping?.epicNumber ? result.electionMapping : null,
  } as VoterWithElectionData;
}

// Voter-related queries
export async function getVoterByEpicNumber(epicNumber: string, electionId?: string): Promise<Array<VoterWithPartNo>> {
  try {
    const currentElectionId = electionId || await getCurrentElectionId();

    const results = await db
      .select({
        epicNumber: VoterMaster.epicNumber,
        fullName: VoterMaster.fullName,
        relationType: VoterMaster.relationType,
        relationName: VoterMaster.relationName,
        familyGrouping: VoterMaster.familyGrouping,
        acNo: BoothMaster.acNo,
        boothNo: ElectionMapping.boothNo,
        srNo: ElectionMapping.srNo,
        houseNumber: VoterMaster.houseNumber,
        religion: VoterMaster.religion,
        age: VoterMaster.age,
        gender: VoterMaster.gender,
        isVoted2024: ElectionMapping.hasVoted, // Map from ElectionMapping
        mobileNoPrimary: VoterMaster.mobileNoPrimary,
        mobileNoSecondary: VoterMaster.mobileNoSecondary,
        address: VoterMaster.address,
        localityStreet: VoterMaster.localityStreet,
        townVillage: VoterMaster.townVillage,
        pincode: VoterMaster.pincode,
        createdAt: VoterMaster.createdAt,
        updatedAt: VoterMaster.updatedAt,
        wardNo: BoothMaster.wardNo,
        boothName: BoothMaster.boothName,
        englishBoothAddress: BoothMaster.boothAddress,
      })
      .from(VoterMaster)
      .leftJoin(
        ElectionMapping,
        and(
          eq(VoterMaster.epicNumber, ElectionMapping.epicNumber),
          eq(ElectionMapping.electionId, currentElectionId)
        )
      )
      .leftJoin(
        BoothMaster,
        and(
          eq(ElectionMapping.electionId, BoothMaster.electionId),
          eq(ElectionMapping.boothNo, BoothMaster.boothNo)
        )
      )
      .leftJoin(PartNo, eq(ElectionMapping.boothNo, PartNo.partNo))
      .where(eq(VoterMaster.epicNumber, epicNumber));

    return results as unknown as Array<VoterWithPartNo>;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voter by EPIC number',
    );
  }
}

export async function getAllVoter(electionId?: string): Promise<Array<Voter>> {
  try {
    const currentElectionId = electionId || await getCurrentElectionId();

    const results = await db
      .select({
        epicNumber: VoterMaster.epicNumber,
        fullName: VoterMaster.fullName,
        relationType: VoterMaster.relationType,
        relationName: VoterMaster.relationName,
        familyGrouping: VoterMaster.familyGrouping,
        acNo: BoothMaster.acNo,
        boothNo: ElectionMapping.boothNo,
        srNo: ElectionMapping.srNo,
        houseNumber: VoterMaster.houseNumber,
        religion: VoterMaster.religion,
        age: VoterMaster.age,
        dob: VoterMaster.dob,
        gender: VoterMaster.gender,
        isVoted2024: ElectionMapping.hasVoted,
        mobileNoPrimary: VoterMaster.mobileNoPrimary,
        mobileNoSecondary: VoterMaster.mobileNoSecondary,
        address: VoterMaster.address,
        localityStreet: VoterMaster.localityStreet,
        townVillage: VoterMaster.townVillage,
        pincode: VoterMaster.pincode,
        createdAt: VoterMaster.createdAt,
        updatedAt: VoterMaster.updatedAt,
      })
      .from(VoterMaster)
      .leftJoin(
        ElectionMapping,
        and(
          eq(VoterMaster.epicNumber, ElectionMapping.epicNumber),
          eq(ElectionMapping.electionId, currentElectionId)
        )
      )
      .leftJoin(
        BoothMaster,
        and(
          eq(ElectionMapping.electionId, BoothMaster.electionId),
          eq(ElectionMapping.boothNo, BoothMaster.boothNo)
        )
      )
      .orderBy(asc(VoterMaster.fullName));

    return results as unknown as Array<Voter>;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get all voters',
    );
  }
}

export async function getVoterByAC(acNo: string, electionId?: string): Promise<Array<Voter>> {
  try {
    const currentElectionId = electionId || await getCurrentElectionId();

    const results = await db
      .select({
        epicNumber: VoterMaster.epicNumber,
        fullName: VoterMaster.fullName,
        relationType: VoterMaster.relationType,
        relationName: VoterMaster.relationName,
        familyGrouping: VoterMaster.familyGrouping,
        acNo: BoothMaster.acNo,
        boothNo: ElectionMapping.boothNo,
        srNo: ElectionMapping.srNo,
        houseNumber: VoterMaster.houseNumber,
        religion: VoterMaster.religion,
        age: VoterMaster.age,
        dob: VoterMaster.dob,
        gender: VoterMaster.gender,
        isVoted2024: ElectionMapping.hasVoted,
        mobileNoPrimary: VoterMaster.mobileNoPrimary,
        mobileNoSecondary: VoterMaster.mobileNoSecondary,
        address: VoterMaster.address,
        localityStreet: VoterMaster.localityStreet,
        townVillage: VoterMaster.townVillage,
        pincode: VoterMaster.pincode,
        createdAt: VoterMaster.createdAt,
        updatedAt: VoterMaster.updatedAt,
      })
      .from(VoterMaster)
      .innerJoin(
        ElectionMapping,
        and(
          eq(VoterMaster.epicNumber, ElectionMapping.epicNumber),
          eq(ElectionMapping.electionId, currentElectionId)
        )
      )
      .innerJoin(
        BoothMaster,
        and(
          eq(ElectionMapping.electionId, BoothMaster.electionId),
          eq(ElectionMapping.boothNo, BoothMaster.boothNo),
          eq(BoothMaster.acNo, acNo)
        )
      )
      .orderBy(asc(VoterMaster.fullName));

    return results as unknown as Array<Voter>;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voters by AC number',
    );
  }
}

export async function getVoterByWard(wardNo: string, electionId?: string): Promise<Array<VoterWithPartNo>> {
  try {
    const currentElectionId = electionId || await getCurrentElectionId();

    return await db
      .select({
        epicNumber: VoterMaster.epicNumber,
        fullName: VoterMaster.fullName,
        relationType: VoterMaster.relationType,
        relationName: VoterMaster.relationName,
        familyGrouping: VoterMaster.familyGrouping,
        acNo: BoothMaster.acNo,
        boothNo: ElectionMapping.boothNo,
        srNo: ElectionMapping.srNo,
        houseNumber: VoterMaster.houseNumber,
        religion: VoterMaster.religion,
        age: VoterMaster.age,
        gender: VoterMaster.gender,
        isVoted2024: ElectionMapping.hasVoted,
        mobileNoPrimary: VoterMaster.mobileNoPrimary,
        mobileNoSecondary: VoterMaster.mobileNoSecondary,
        address: VoterMaster.address,
        localityStreet: VoterMaster.localityStreet,
        townVillage: VoterMaster.townVillage,
        pincode: VoterMaster.pincode,
        createdAt: VoterMaster.createdAt,
        updatedAt: VoterMaster.updatedAt,
        wardNo: BoothMaster.wardNo,
        boothName: BoothMaster.boothName,
        englishBoothAddress: BoothMaster.boothAddress,
      })
      .from(VoterMaster)
      .innerJoin(
        ElectionMapping,
        and(
          eq(VoterMaster.epicNumber, ElectionMapping.epicNumber),
          eq(ElectionMapping.electionId, currentElectionId)
        )
      )
      .innerJoin(
        BoothMaster,
        and(
          eq(ElectionMapping.electionId, BoothMaster.electionId),
          eq(ElectionMapping.boothNo, BoothMaster.boothNo),
          eq(BoothMaster.wardNo, wardNo)
        )
      )
      .leftJoin(PartNo, eq(ElectionMapping.boothNo, PartNo.partNo))
      .orderBy(asc(VoterMaster.fullName)) as unknown as Array<VoterWithPartNo>;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voters by ward number',
    );
  }
}

export async function getVoterByPart(partNo: string, electionId?: string): Promise<Array<Voter>> {
  try {
    const currentElectionId = electionId || await getCurrentElectionId();

    const results = await db
      .select({
        epicNumber: VoterMaster.epicNumber,
        fullName: VoterMaster.fullName,
        relationType: VoterMaster.relationType,
        relationName: VoterMaster.relationName,
        familyGrouping: VoterMaster.familyGrouping,
        acNo: BoothMaster.acNo,
        boothNo: ElectionMapping.boothNo,
        srNo: ElectionMapping.srNo,
        houseNumber: VoterMaster.houseNumber,
        religion: VoterMaster.religion,
        age: VoterMaster.age,
        dob: VoterMaster.dob,
        gender: VoterMaster.gender,
        isVoted2024: ElectionMapping.hasVoted,
        mobileNoPrimary: VoterMaster.mobileNoPrimary,
        mobileNoSecondary: VoterMaster.mobileNoSecondary,
        address: VoterMaster.address,
        localityStreet: VoterMaster.localityStreet,
        townVillage: VoterMaster.townVillage,
        pincode: VoterMaster.pincode,
        createdAt: VoterMaster.createdAt,
        updatedAt: VoterMaster.updatedAt,
      })
      .from(VoterMaster)
      .innerJoin(
        ElectionMapping,
        and(
          eq(VoterMaster.epicNumber, ElectionMapping.epicNumber),
          eq(ElectionMapping.electionId, currentElectionId),
          eq(ElectionMapping.boothNo, partNo)
        )
      )
      .leftJoin(
        BoothMaster,
        and(
          eq(ElectionMapping.electionId, BoothMaster.electionId),
          eq(ElectionMapping.boothNo, BoothMaster.boothNo)
        )
      )
      .orderBy(asc(VoterMaster.fullName));

    return results as unknown as Array<Voter>;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voters by part number',
    );
  }
}

export async function getVoterByBooth(boothName: string, electionId?: string): Promise<Array<VoterWithPartNo>> {
  try {
    const currentElectionId = electionId || await getCurrentElectionId();

    return await db
      .select({
        epicNumber: VoterMaster.epicNumber,
        fullName: VoterMaster.fullName,
        relationType: VoterMaster.relationType,
        relationName: VoterMaster.relationName,
        familyGrouping: VoterMaster.familyGrouping,
        acNo: BoothMaster.acNo,
        boothNo: ElectionMapping.boothNo,
        srNo: ElectionMapping.srNo,
        houseNumber: VoterMaster.houseNumber,
        religion: VoterMaster.religion,
        age: VoterMaster.age,
        gender: VoterMaster.gender,
        isVoted2024: ElectionMapping.hasVoted,
        mobileNoPrimary: VoterMaster.mobileNoPrimary,
        mobileNoSecondary: VoterMaster.mobileNoSecondary,
        address: VoterMaster.address,
        localityStreet: VoterMaster.localityStreet,
        townVillage: VoterMaster.townVillage,
        pincode: VoterMaster.pincode,
        createdAt: VoterMaster.createdAt,
        updatedAt: VoterMaster.updatedAt,
        wardNo: BoothMaster.wardNo,
        boothName: BoothMaster.boothName,
        englishBoothAddress: BoothMaster.boothAddress,
      })
      .from(VoterMaster)
      .innerJoin(
        ElectionMapping,
        and(
          eq(VoterMaster.epicNumber, ElectionMapping.epicNumber),
          eq(ElectionMapping.electionId, currentElectionId)
        )
      )
      .innerJoin(
        BoothMaster,
        and(
          eq(ElectionMapping.electionId, BoothMaster.electionId),
          eq(ElectionMapping.boothNo, BoothMaster.boothNo),
          eq(BoothMaster.boothName, boothName)
        )
      )
      .leftJoin(PartNo, eq(ElectionMapping.boothNo, PartNo.partNo))
      .orderBy(asc(VoterMaster.fullName)) as unknown as Array<VoterWithPartNo>;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voters by booth name',
    );
  }
}

export async function searchVoterByEpicNumber(epicNumber: string, electionId?: string): Promise<Array<VoterWithPartNo>> {
  try {
    const currentElectionId = electionId || await getCurrentElectionId();

    const results = await db
      .select({
        epicNumber: VoterMaster.epicNumber,
        fullName: VoterMaster.fullName,
        relationType: VoterMaster.relationType,
        relationName: VoterMaster.relationName,
        familyGrouping: VoterMaster.familyGrouping,
        acNo: BoothMaster.acNo,
        boothNo: ElectionMapping.boothNo,
        srNo: ElectionMapping.srNo,
        houseNumber: VoterMaster.houseNumber,
        religion: VoterMaster.religion,
        age: VoterMaster.age,
        dob: VoterMaster.dob,
        gender: VoterMaster.gender,
        isVoted2024: ElectionMapping.hasVoted,
        mobileNoPrimary: VoterMaster.mobileNoPrimary,
        mobileNoSecondary: VoterMaster.mobileNoSecondary,
        address: VoterMaster.address,
        localityStreet: VoterMaster.localityStreet,
        townVillage: VoterMaster.townVillage,
        pincode: VoterMaster.pincode,
        createdAt: VoterMaster.createdAt,
        updatedAt: VoterMaster.updatedAt,
        wardNo: BoothMaster.wardNo,
        boothName: BoothMaster.boothName,
        englishBoothAddress: BoothMaster.boothAddress,
      })
      .from(VoterMaster)
      .leftJoin(
        ElectionMapping,
        and(
          eq(VoterMaster.epicNumber, ElectionMapping.epicNumber),
          eq(ElectionMapping.electionId, currentElectionId)
        )
      )
      .leftJoin(
        BoothMaster,
        and(
          eq(ElectionMapping.electionId, BoothMaster.electionId),
          eq(ElectionMapping.boothNo, BoothMaster.boothNo)
        )
      )
      .leftJoin(PartNo, eq(ElectionMapping.boothNo, PartNo.partNo))
      .where(sql`LOWER(${VoterMaster.epicNumber}) LIKE LOWER(${`%${epicNumber}%`})`)
      .orderBy(asc(VoterMaster.epicNumber));

    return results as unknown as Array<VoterWithPartNo>;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to search voters by EPIC number',
    );
  }
}

export async function searchVoterByName(name: string, electionId?: string): Promise<Array<VoterWithPartNo>> {
  try {
    const currentElectionId = electionId || await getCurrentElectionId();

    const results = await db
      .select({
        epicNumber: VoterMaster.epicNumber,
        fullName: VoterMaster.fullName,
        relationType: VoterMaster.relationType,
        relationName: VoterMaster.relationName,
        familyGrouping: VoterMaster.familyGrouping,
        acNo: BoothMaster.acNo,
        boothNo: ElectionMapping.boothNo,
        srNo: ElectionMapping.srNo,
        houseNumber: VoterMaster.houseNumber,
        religion: VoterMaster.religion,
        age: VoterMaster.age,
        dob: VoterMaster.dob,
        gender: VoterMaster.gender,
        isVoted2024: ElectionMapping.hasVoted,
        mobileNoPrimary: VoterMaster.mobileNoPrimary,
        mobileNoSecondary: VoterMaster.mobileNoSecondary,
        address: VoterMaster.address,
        localityStreet: VoterMaster.localityStreet,
        townVillage: VoterMaster.townVillage,
        pincode: VoterMaster.pincode,
        createdAt: VoterMaster.createdAt,
        updatedAt: VoterMaster.updatedAt,
        wardNo: BoothMaster.wardNo,
        boothName: BoothMaster.boothName,
        englishBoothAddress: BoothMaster.boothAddress,
      })
      .from(VoterMaster)
      .leftJoin(
        ElectionMapping,
        and(
          eq(VoterMaster.epicNumber, ElectionMapping.epicNumber),
          eq(ElectionMapping.electionId, currentElectionId)
        )
      )
      .leftJoin(
        BoothMaster,
        and(
          eq(ElectionMapping.electionId, BoothMaster.electionId),
          eq(ElectionMapping.boothNo, BoothMaster.boothNo)
        )
      )
      .leftJoin(PartNo, eq(ElectionMapping.boothNo, PartNo.partNo))
      .where(sql`LOWER(${VoterMaster.fullName}) LIKE LOWER(${`%${name}%`})`)
      .orderBy(asc(VoterMaster.fullName));

    return results as unknown as Array<VoterWithPartNo>;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to search voters by name',
    );
  }
}

export async function searchVoterByPhoneNumber(phoneNumber: string): Promise<Array<VoterWithPartNo>> {
  try {
    // Clean the phone number (remove spaces, dashes, etc.)
    const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');

    const results = await db
      .select({
        epicNumber: Voters.epicNumber,
        fullName: Voters.fullName,
        relationType: Voters.relationType,
        relationName: Voters.relationName,
        familyGrouping: Voters.familyGrouping,
        acNo: Voters.acNo,
        partNo: Voters.partNo,
        srNo: Voters.srNo,
        houseNumber: Voters.houseNumber,
        religion: Voters.religion,
        age: Voters.age,
        dob: Voters.dob,
        gender: Voters.gender,
        isVoted2024: Voters.isVoted2024,
        mobileNoPrimary: Voters.mobileNoPrimary,
        mobileNoSecondary: Voters.mobileNoSecondary,
        address: Voters.address,
        pincode: Voters.pincode,
        createdAt: Voters.createdAt,
        updatedAt: Voters.updatedAt,
        wardNo: PartNo.wardNo,
        boothName: PartNo.boothName,
        englishBoothAddress: PartNo.englishBoothAddress,
      })
      .from(Voters)
      .leftJoin(PartNo, eq(Voters.partNo, PartNo.partNo))
      .where(
        sql`(${Voters.mobileNoPrimary} LIKE ${`%${cleanPhone}%`} OR ${Voters.mobileNoSecondary} LIKE ${`%${cleanPhone}%`})`
      )
      .orderBy(asc(Voters.fullName));

    return results as unknown as Array<VoterWithPartNo>;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to search voters by phone number',
    );
  }
}

export async function searchVoterByMobileNumberTable(mobileNumber: string): Promise<Array<VoterWithPartNo>> {
  try {
    // Clean the mobile number (remove spaces, dashes, etc.)
    const cleanMobile = mobileNumber.replace(/[\s\-\(\)]/g, '');

    // First get epic numbers from voterMobileNumber table that match the mobile number
    const matchingEpicNumbers = await db
      .selectDistinct({
        epicNumber: voterMobileNumber.epicNumber,
      })
      .from(voterMobileNumber)
      .where(sql`${voterMobileNumber.mobileNumber} LIKE ${`%${cleanMobile}%`}`);

    if (matchingEpicNumbers.length === 0) {
      return [];
    }

    const epicNumbers = matchingEpicNumbers.map((row) => row.epicNumber);

    // Now get full voter details for those epic numbers
    const results = await db
      .select({
        epicNumber: Voters.epicNumber,
        fullName: Voters.fullName,
        relationType: Voters.relationType,
        relationName: Voters.relationName,
        familyGrouping: Voters.familyGrouping,
        acNo: Voters.acNo,
        partNo: Voters.partNo,
        srNo: Voters.srNo,
        houseNumber: Voters.houseNumber,
        religion: Voters.religion,
        age: Voters.age,
        dob: Voters.dob,
        gender: Voters.gender,
        isVoted2024: Voters.isVoted2024,
        mobileNoPrimary: Voters.mobileNoPrimary,
        mobileNoSecondary: Voters.mobileNoSecondary,
        address: Voters.address,
        pincode: Voters.pincode,
        createdAt: Voters.createdAt,
        updatedAt: Voters.updatedAt,
        wardNo: PartNo.wardNo,
        boothName: PartNo.boothName,
        englishBoothAddress: PartNo.englishBoothAddress,
      })
      .from(Voters)
      .leftJoin(PartNo, eq(Voters.partNo, PartNo.partNo))
      .where(inArray(Voters.epicNumber, epicNumbers))
      .orderBy(asc(Voters.fullName));

    return results as unknown as Array<VoterWithPartNo>;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to search voters by mobile number table',
    );
  }
}

export async function getVoterByVotingStatus(voted: boolean): Promise<Array<Voter>> {
  try {
    return await db
      .select()
      .from(Voters)
      .where(eq(Voters.isVoted2024, voted))
      .orderBy(asc(Voters.fullName));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voters by voting status',
    );
  }
}

export async function getVoterCount(): Promise<number> {
  try {
    const result = await db.select({ count: count() }).from(Voters);
    return result[0]?.count || 0;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voter count',
    );
  }
}

export async function getVoterCountByAC(acNo: string): Promise<number> {
  try {
    const result = await db
      .select({ count: count() })
      .from(Voters)
      .where(eq(Voters.acNo, acNo));
    return result[0]?.count || 0;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voter count by AC',
    );
  }
}

export async function getVotersByGender(gender: string): Promise<Array<Voter>> {
  try {
    return await db
      .select()
      .from(Voters)
      .where(eq(Voters.gender, gender))
      .orderBy(asc(Voters.fullName));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voters by gender',
    );
  }
}

export async function searchVoterByDetails(params: {
  name?: string;
  gender?: string;
  age?: number;
  ageRange?: number;
}): Promise<Array<VoterWithPartNo>> {
  try {
    const conditions: any[] = [];

    // Name search
    if (params.name?.trim()) {
      conditions.push(sql`LOWER(${Voters.fullName}) LIKE LOWER(${`%${params.name.trim()}%`})`);
    }

    // Gender search
    if (params.gender && params.gender !== '') {
      conditions.push(eq(Voters.gender, params.gender));
    }

    // Age search with range
    if (params.age !== undefined && params.age !== null) {
      const ageRange = params.ageRange || 0;
      const minAge = Math.max(0, params.age - ageRange);
      const maxAge = params.age + ageRange;
      conditions.push(sql`${Voters.age} >= ${minAge} AND ${Voters.age} <= ${maxAge}`);
    }

    // If no conditions, return empty array
    if (conditions.length === 0) {
      return [];
    }

    const results = await db
      .select({
        epicNumber: Voters.epicNumber,
        fullName: Voters.fullName,
        relationType: Voters.relationType,
        relationName: Voters.relationName,
        familyGrouping: Voters.familyGrouping,
        acNo: Voters.acNo,
        partNo: Voters.partNo,
        srNo: Voters.srNo,
        houseNumber: Voters.houseNumber,
        religion: Voters.religion,
        age: Voters.age,
        gender: Voters.gender,
        isVoted2024: Voters.isVoted2024,
        mobileNoPrimary: Voters.mobileNoPrimary,
        mobileNoSecondary: Voters.mobileNoSecondary,
        address: Voters.address,
        pincode: Voters.pincode,
        createdAt: Voters.createdAt,
        updatedAt: Voters.updatedAt,
        wardNo: PartNo.wardNo,
        boothName: PartNo.boothName,
        englishBoothAddress: PartNo.englishBoothAddress,
      })
      .from(Voters)
      .leftJoin(PartNo, eq(Voters.partNo, PartNo.partNo))
      .where(sql`${sql.join(conditions, sql` AND `)}`)
      .orderBy(asc(Voters.fullName));

    return results as unknown as Array<VoterWithPartNo>;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to search voters by details',
    );
  }
}

export async function getVotersByAgeRange(minAge: number, maxAge: number): Promise<Array<Voter>> {
  try {
    return await db
      .select()
      .from(Voters)
      .where(and(gte(Voters.age, minAge), lte(Voters.age, maxAge)))
      .orderBy(asc(Voters.fullName));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voters by age range',
    );
  }
}

export async function getVotersByGenderAndAC(gender: string, acNo: string): Promise<Array<Voter>> {
  try {
    return await db
      .select()
      .from(Voters)
      .where(and(eq(Voters.gender, gender), eq(Voters.acNo, acNo)))
      .orderBy(asc(Voters.fullName));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voters by gender and AC',
    );
  }
}

export async function getVoterDemographics(): Promise<{
  totalVoters: number;
  maleCount: number;
  femaleCount: number;
  otherGenderCount: number;
  averageAge: number;
  ageGroups: { range: string; count: number }[];
}> {
  try {
    const totalResult = await db.select({ count: count() }).from(Voters);
    const genderResults = await db
      .select({ gender: Voters.gender, count: count() })
      .from(Voters)
      .groupBy(Voters.gender);

    const ageResults = await db
      .select({ age: Voters.age })
      .from(Voters)
      .where(sql`${Voters.age} IS NOT NULL`);

    const totalVoters = totalResult[0]?.count || 0;
    const maleCount = genderResults.find(r => r.gender === 'M')?.count || 0;
    const femaleCount = genderResults.find(r => r.gender === 'F')?.count || 0;
    const otherGenderCount = genderResults.find(r => r.gender && !['M', 'F'].includes(r.gender))?.count || 0;

    const ages = ageResults.map(r => r.age).filter(age => age !== null) as number[];
    const averageAge = ages.length > 0 ? ages.reduce((sum, age) => sum + age, 0) / ages.length : 0;

    // Age groups
    const ageGroups = [
      { range: '18-25', count: ages.filter(age => age >= 18 && age <= 25).length },
      { range: '26-35', count: ages.filter(age => age >= 26 && age <= 35).length },
      { range: '36-45', count: ages.filter(age => age >= 36 && age <= 45).length },
      { range: '46-55', count: ages.filter(age => age >= 46 && age <= 55).length },
      { range: '56-65', count: ages.filter(age => age >= 56 && age <= 65).length },
      { range: '65+', count: ages.filter(age => age > 65).length },
    ];

    return {
      totalVoters,
      maleCount,
      femaleCount,
      otherGenderCount,
      averageAge: Math.round(averageAge * 100) / 100,
      ageGroups,
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voter demographics',
    );
  }
}

// Operator functions for updating voter mobile numbers
export async function getVotersByFamilyGrouping(
  familyGrouping: string | null,
  partNo: string | null,
): Promise<Array<Voter>> {
  try {
    if (!familyGrouping || !partNo) {
      return [];
    }

    return await db
      .select()
      .from(Voters)
      .where(and(eq(Voters.familyGrouping, familyGrouping), eq(Voters.partNo, partNo)))
      .orderBy(asc(Voters.fullName));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voters by family grouping',
    );
  }
}

export async function getRelatedVoters(voter: Voter | VoterWithPartNo): Promise<Array<VoterWithPartNo>> {
  try {
    if (!voter.familyGrouping || !voter.partNo) {
      return [];
    }

    const relatedVoters = await db
      .select({
        epicNumber: Voters.epicNumber,
        fullName: Voters.fullName,
        relationType: Voters.relationType,
        relationName: Voters.relationName,
        familyGrouping: Voters.familyGrouping,
        acNo: Voters.acNo,
        partNo: Voters.partNo,
        srNo: Voters.srNo,
        houseNumber: Voters.houseNumber,
        religion: Voters.religion,
        age: Voters.age,
        gender: Voters.gender,
        isVoted2024: Voters.isVoted2024,
        mobileNoPrimary: Voters.mobileNoPrimary,
        mobileNoSecondary: Voters.mobileNoSecondary,
        address: Voters.address,
        pincode: Voters.pincode,
        createdAt: Voters.createdAt,
        updatedAt: Voters.updatedAt,
        wardNo: PartNo.wardNo,
        boothName: PartNo.boothName,
        englishBoothAddress: PartNo.englishBoothAddress,
      })
      .from(Voters)
      .leftJoin(PartNo, eq(Voters.partNo, PartNo.partNo))
      .where(
        and(
          eq(Voters.familyGrouping, voter.familyGrouping),
          eq(Voters.partNo, voter.partNo),
          ne(Voters.epicNumber, voter.epicNumber),
        ),
      )
      .orderBy(asc(Voters.fullName));

    return relatedVoters as Array<VoterWithPartNo>;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get related voters',
    );
  }
}

export async function updateVoterMobileNumber(
  epicNumber: string,
  mobileNoPrimary?: string,
  mobileNoSecondary?: string,
  updatedBy?: string,
  sourceModule?: string
): Promise<Voter | null> {
  try {
    // Fetch current phone numbers before update
    const [currentVoter] = await db
      .select({
        mobileNoPrimary: Voters.mobileNoPrimary,
        mobileNoSecondary: Voters.mobileNoSecondary,
      })
      .from(Voters)
      .where(eq(Voters.epicNumber, epicNumber))
      .limit(1);

    if (!currentVoter) {
      return null;
    }

    const oldMobileNoPrimary = currentVoter.mobileNoPrimary || null;
    const oldMobileNoSecondary = currentVoter.mobileNoSecondary || null;

    const updateData: Partial<Voter> = { updatedAt: new Date() };
    if (mobileNoPrimary !== undefined) updateData.mobileNoPrimary = mobileNoPrimary;
    if (mobileNoSecondary !== undefined) updateData.mobileNoSecondary = mobileNoSecondary;

    const [updatedVoter] = await db
      .update(Voters)
      .set(updateData)
      .where(eq(Voters.epicNumber, epicNumber))
      .returning();

    if (!updatedVoter) {
      return null;
    }

    // Track phone number changes if they actually changed and tracking parameters are provided
    const newMobileNoPrimary = updatedVoter.mobileNoPrimary || null;
    const newMobileNoSecondary = updatedVoter.mobileNoSecondary || null;

    const primaryChanged = oldMobileNoPrimary !== newMobileNoPrimary;
    const secondaryChanged = oldMobileNoSecondary !== newMobileNoSecondary;

    if ((primaryChanged || secondaryChanged) && updatedBy && sourceModule) {
      await db.insert(phoneUpdateHistory).values({
        epicNumber,
        oldMobileNoPrimary,
        newMobileNoPrimary,
        oldMobileNoSecondary,
        newMobileNoSecondary,
        updatedBy,
        sourceModule,
      });
    }

    // Sync with VoterMobileNumber table
    await syncVoterMobileNumberTable(epicNumber, newMobileNoPrimary, newMobileNoSecondary);

    return updatedVoter;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update voter mobile number',
    );
  }
}

export async function updateVoterMobileNumbers(
  updates: Array<{
    epicNumber: string;
    mobileNoPrimary?: string;
    mobileNoSecondary?: string;
  }>
): Promise<Array<Voter>> {
  try {
    const results: Array<Voter> = [];

    for (const update of updates) {
      const updateData: Partial<Voter> = { updatedAt: new Date() };
      if (update.mobileNoPrimary !== undefined) updateData.mobileNoPrimary = update.mobileNoPrimary;
      if (update.mobileNoSecondary !== undefined) updateData.mobileNoSecondary = update.mobileNoSecondary;

      const [updatedVoter] = await db
        .update(Voters)
        .set(updateData)
        .where(eq(Voters.epicNumber, update.epicNumber))
        .returning();

      if (updatedVoter) {
        results.push(updatedVoter);

        // Sync with VoterMobileNumber table
        await syncVoterMobileNumberTable(
          update.epicNumber,
          updatedVoter.mobileNoPrimary || null,
          updatedVoter.mobileNoSecondary || null
        );
      }
    }

    return results;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update voter mobile numbers',
    );
  }
}

export async function updateVoter(
  epicNumber: string,
  updateData: Partial<Pick<Voter, 'fullName' | 'age' | 'gender' | 'familyGrouping' | 'religion' | 'mobileNoPrimary' | 'mobileNoSecondary' | 'houseNumber' | 'address' | 'pincode' | 'relationType' | 'relationName' | 'isVoted2024'>>,
  updatedBy?: string,
  sourceModule?: string
): Promise<Voter | null> {
  try {
    // Check if phone numbers are being updated
    const isUpdatingPhone = updateData.mobileNoPrimary !== undefined || updateData.mobileNoSecondary !== undefined;

    // Fetch current phone numbers before update if tracking phone changes
    let oldMobileNoPrimary: string | null = null;
    let oldMobileNoSecondary: string | null = null;

    if (isUpdatingPhone && updatedBy && sourceModule) {
      const [currentVoter] = await db
        .select({
          mobileNoPrimary: VoterMaster.mobileNoPrimary,
          mobileNoSecondary: VoterMaster.mobileNoSecondary,
        })
        .from(VoterMaster)
        .where(eq(VoterMaster.epicNumber, epicNumber))
        .limit(1);

      if (currentVoter) {
        oldMobileNoPrimary = currentVoter.mobileNoPrimary || null;
        oldMobileNoSecondary = currentVoter.mobileNoSecondary || null;
      }
    }

    // Separate isVoted2024 from other updates (it goes to VotingHistory)
    const { isVoted2024, ...voterMasterData } = updateData;
    const dataToUpdate: Partial<VoterMasterType> = { updatedAt: new Date() };

    if (voterMasterData.fullName !== undefined) {
      dataToUpdate.fullName = voterMasterData.fullName;
    }
    if (voterMasterData.age !== undefined) {
      dataToUpdate.age = voterMasterData.age;
    }
    if (voterMasterData.gender !== undefined) {
      dataToUpdate.gender = voterMasterData.gender;
    }
    if (voterMasterData.familyGrouping !== undefined) {
      dataToUpdate.familyGrouping = voterMasterData.familyGrouping;
    }
    if (voterMasterData.religion !== undefined) {
      dataToUpdate.religion = voterMasterData.religion;
    }
    if (voterMasterData.mobileNoPrimary !== undefined) {
      dataToUpdate.mobileNoPrimary = voterMasterData.mobileNoPrimary;
    }
    if (voterMasterData.mobileNoSecondary !== undefined) {
      dataToUpdate.mobileNoSecondary = voterMasterData.mobileNoSecondary;
    }
    if (voterMasterData.houseNumber !== undefined) {
      dataToUpdate.houseNumber = voterMasterData.houseNumber;
    }
    if (voterMasterData.address !== undefined) {
      dataToUpdate.address = voterMasterData.address;
    }
    if (voterMasterData.pincode !== undefined) {
      dataToUpdate.pincode = voterMasterData.pincode;
    }
    if (voterMasterData.relationType !== undefined) {
      dataToUpdate.relationType = voterMasterData.relationType;
    }
    if (voterMasterData.relationName !== undefined) {
      dataToUpdate.relationName = voterMasterData.relationName;
    }

    // Update VoterMaster
    const [updatedVoterMaster] = await db
      .update(VoterMaster)
      .set(dataToUpdate)
      .where(eq(VoterMaster.epicNumber, epicNumber))
      .returning();

    if (!updatedVoterMaster) {
      return null;
    }

    // Update ElectionMapping.hasVoted if isVoted2024 is provided
    if (isVoted2024 !== undefined && isVoted2024 !== null) {
      const currentElectionId = await getCurrentElectionId();
      await markVoterVote(
        epicNumber,
        currentElectionId,
        isVoted2024
      );
    }

    // Track phone number changes if they actually changed and tracking parameters are provided
    if (isUpdatingPhone && updatedBy && sourceModule) {
      const newMobileNoPrimary = updatedVoterMaster.mobileNoPrimary || null;
      const newMobileNoSecondary = updatedVoterMaster.mobileNoSecondary || null;

      const primaryChanged = oldMobileNoPrimary !== newMobileNoPrimary;
      const secondaryChanged = oldMobileNoSecondary !== newMobileNoSecondary;

      if (primaryChanged || secondaryChanged) {
        await db.insert(phoneUpdateHistory).values({
          epicNumber,
          oldMobileNoPrimary,
          newMobileNoPrimary,
          oldMobileNoSecondary,
          newMobileNoSecondary,
          updatedBy,
          sourceModule,
        });

        // Sync with VoterMobileNumber table
        await syncVoterMobileNumberTable(epicNumber, newMobileNoPrimary, newMobileNoSecondary);
      }
    }

    // Return voter in the old format for backward compatibility
    const currentElectionId = await getCurrentElectionId();
    const voters = await getVoterByEpicNumber(epicNumber, currentElectionId);
    return voters[0] as Voter | null;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update voter',
    );
  }
}

export async function getPhoneUpdateStats() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count total phone updates today
    const [todayCountResult] = await db
      .select({ count: count() })
      .from(phoneUpdateHistory)
      .where(gte(phoneUpdateHistory.createdAt, today));

    const phoneUpdatesToday = todayCountResult?.count || 0;

    // Count total voters with phone numbers (primary or secondary)
    const [totalVotersWithPhoneResult] = await db
      .select({ count: count() })
      .from(Voters)
      .where(
        or(
          sql`${Voters.mobileNoPrimary} IS NOT NULL AND ${Voters.mobileNoPrimary} != ''`,
          sql`${Voters.mobileNoSecondary} IS NOT NULL AND ${Voters.mobileNoSecondary} != ''`
        )!
      );

    const totalVotersWithPhone = totalVotersWithPhoneResult?.count || 0;

    // Count phone updates by source module today
    const updatesBySource = await db
      .select({
        sourceModule: phoneUpdateHistory.sourceModule,
        count: count(),
      })
      .from(phoneUpdateHistory)
      .where(gte(phoneUpdateHistory.createdAt, today))
      .groupBy(phoneUpdateHistory.sourceModule);

    const phoneUpdatesBySource: Record<string, number> = {};
    for (const row of updatesBySource) {
      phoneUpdatesBySource[row.sourceModule] = row.count;
    }

    // Count phone updates by user today
    const updatesByUser = await db
      .select({
        updatedBy: phoneUpdateHistory.updatedBy,
        updatedByUserId: user.userId,
        count: count(),
      })
      .from(phoneUpdateHistory)
      .leftJoin(user, eq(phoneUpdateHistory.updatedBy, user.id))
      .where(gte(phoneUpdateHistory.createdAt, today))
      .groupBy(phoneUpdateHistory.updatedBy, user.userId);

    const phoneUpdatesByUser: Array<{ userId: string | null; count: number }> = [];
    for (const row of updatesByUser) {
      phoneUpdatesByUser.push({
        userId: row.updatedByUserId || 'Unknown',
        count: row.count,
      });
    }

    // Get recent phone updates (last 20) with voter info
    const recentUpdates = await db
      .select({
        id: phoneUpdateHistory.id,
        epicNumber: phoneUpdateHistory.epicNumber,
        oldMobileNoPrimary: phoneUpdateHistory.oldMobileNoPrimary,
        newMobileNoPrimary: phoneUpdateHistory.newMobileNoPrimary,
        oldMobileNoSecondary: phoneUpdateHistory.oldMobileNoSecondary,
        newMobileNoSecondary: phoneUpdateHistory.newMobileNoSecondary,
        sourceModule: phoneUpdateHistory.sourceModule,
        createdAt: phoneUpdateHistory.createdAt,
        updatedBy: phoneUpdateHistory.updatedBy,
        voterFullName: Voters.fullName,
        updatedByUserId: user.userId,
      })
      .from(phoneUpdateHistory)
      .leftJoin(Voters, eq(phoneUpdateHistory.epicNumber, Voters.epicNumber))
      .leftJoin(user, eq(phoneUpdateHistory.updatedBy, user.id))
      .orderBy(desc(phoneUpdateHistory.createdAt))
      .limit(20);

    return {
      phoneUpdatesToday,
      totalVotersWithPhone,
      phoneUpdatesBySource,
      phoneUpdatesByUser,
      recentPhoneUpdates: recentUpdates.map((update) => ({
        id: update.id,
        epicNumber: update.epicNumber,
        voterFullName: update.voterFullName,
        oldMobileNoPrimary: update.oldMobileNoPrimary,
        newMobileNoPrimary: update.newMobileNoPrimary,
        oldMobileNoSecondary: update.oldMobileNoSecondary,
        newMobileNoSecondary: update.newMobileNoSecondary,
        sourceModule: update.sourceModule,
        createdAt: update.createdAt,
        updatedBy: update.updatedByUserId,
      })),
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get phone update statistics',
    );
  }
}

export async function getBeneficiaryServiceStats() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count total services created today
    const [todayCountResult] = await db
      .select({ count: count() })
      .from(beneficiaryServices)
      .where(gte(beneficiaryServices.createdAt, today));

    const servicesCreatedToday = todayCountResult?.count || 0;

    // Count total services
    const [totalCountResult] = await db
      .select({ count: count() })
      .from(beneficiaryServices);

    const totalServices = totalCountResult?.count || 0;

    // Count by status
    const statusCounts = await db
      .select({
        status: beneficiaryServices.status,
        count: count(),
      })
      .from(beneficiaryServices)
      .groupBy(beneficiaryServices.status);

    const byStatus: Record<string, number> = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const row of statusCounts) {
      byStatus[row.status || 'pending'] = row.count;
    }

    // Count by type
    const typeCounts = await db
      .select({
        serviceType: beneficiaryServices.serviceType,
        count: count(),
      })
      .from(beneficiaryServices)
      .groupBy(beneficiaryServices.serviceType);

    const byType: Record<string, number> = {
      individual: 0,
      community: 0,
    };
    for (const row of typeCounts) {
      if (row.serviceType === 'individual' || row.serviceType === 'community') {
        byType[row.serviceType] = row.count;
      }
    }

    return {
      servicesCreatedToday,
      totalServices,
      byStatus,
      byType,
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get beneficiary service statistics',
    );
  }
}

export async function createVoter(voterData: Partial<Voter>): Promise<Voter> {
  try {
    if (!voterData.epicNumber || !voterData.fullName) {
      throw new ChatSDKError(
        'bad_request:database',
        'EPIC Number and Full Name are required',
      );
    }

    const [voter] = await db
      .insert(Voters)
      .values({
        epicNumber: voterData.epicNumber,
        fullName: voterData.fullName,
        relationType: voterData.relationType || null,
        relationName: voterData.relationName || null,
        familyGrouping: voterData.familyGrouping || null,
        acNo: voterData.acNo || null,
        partNo: voterData.partNo || null,
        srNo: voterData.srNo || null,
        houseNumber: voterData.houseNumber || null,
        religion: voterData.religion || null,
        age: voterData.age || null,
        gender: voterData.gender || null,
        mobileNoPrimary: voterData.mobileNoPrimary || null,
        mobileNoSecondary: voterData.mobileNoSecondary || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return voter;
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create voter',
    );
  }
}

// Beneficiary Service queries
// Generate a unique token for beneficiary service
function generateServiceToken(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `BS${timestamp}${random}`.toUpperCase();
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
}: {
  serviceType: 'individual' | 'community';
  serviceName: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  requestedBy: string;
  assignedTo?: string;
  voterId?: string;
  notes?: string;
}): Promise<BeneficiaryService> {
  try {
    const token = generateServiceToken();

    const [service] = await db
      .insert(beneficiaryServices)
      .values({
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
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return service;
  } catch (error) {
    console.error('Database error in createBeneficiaryService:', error);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create beneficiary service',
    );
  }
}

export async function getBeneficiaryServiceById(id: string): Promise<BeneficiaryService | null> {
  try {
    const [service] = await db
      .select()
      .from(beneficiaryServices)
      .where(eq(beneficiaryServices.id, id))
      .limit(1);

    return service || null;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get beneficiary service by id',
    );
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
    const updateData: Partial<BeneficiaryService> = {
      status,
      updatedAt: new Date(),
    };

    if (priority) updateData.priority = priority;
    if (notes) updateData.notes = notes;
    if (assignedTo) updateData.assignedTo = assignedTo;
    if (status === 'completed') updateData.completedAt = new Date();

    const [updatedService] = await db
      .update(beneficiaryServices)
      .set(updateData)
      .where(eq(beneficiaryServices.id, id))
      .returning();

    return updatedService || null;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update beneficiary service status',
    );
  }
}

export async function getBeneficiaryServicesByStatus(status?: string): Promise<Array<BeneficiaryService>> {
  try {
    if (status) {
      return await db
        .select()
        .from(beneficiaryServices)
        .where(eq(beneficiaryServices.status, status as any))
        .orderBy(desc(beneficiaryServices.createdAt));
    }

    return await db
      .select()
      .from(beneficiaryServices)
      .orderBy(desc(beneficiaryServices.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get beneficiary services by status',
    );
  }
}

// Voter Task queries
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
    const [task] = await db
      .insert(voterTasks)
      .values({
        serviceId,
        voterId,
        taskType,
        description,
        status: 'pending',
        priority,
        assignedTo,
        notes,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return task;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create voter task',
    );
  }
}

export async function getVoterTasksByServiceId(serviceId: string): Promise<Array<VoterTask>> {
  try {
    return await db
      .select()
      .from(voterTasks)
      .where(eq(voterTasks.serviceId, serviceId))
      .orderBy(asc(voterTasks.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voter tasks by service id',
    );
  }
}

export async function getVoterTasksByVoterId(voterId: string): Promise<Array<VoterTask>> {
  try {
    return await db
      .select()
      .from(voterTasks)
      .where(eq(voterTasks.voterId, voterId))
      .orderBy(desc(voterTasks.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voter tasks by voter id',
    );
  }
}

export async function getVoterBeneficiaryServices(voterId: string): Promise<{
  individual: Array<BeneficiaryService>;
  community: Array<BeneficiaryService>;
}> {
  try {
    // Query services directly using voterId for individual services
    // For community services, we still need to check VoterTask for backward compatibility during transition
    const individualServices = await db
      .select()
      .from(beneficiaryServices)
      .where(
        and(
          eq(beneficiaryServices.voterId, voterId),
          eq(beneficiaryServices.serviceType, 'individual')
        )
      )
      .orderBy(desc(beneficiaryServices.createdAt));

    // For community services, check if they're linked via VoterTask (legacy)
    // In future, community services should not be linked to individual voters
    const communityTasks = await db
      .select({
        service: beneficiaryServices,
      })
      .from(voterTasks)
      .innerJoin(beneficiaryServices, eq(voterTasks.serviceId, beneficiaryServices.id))
      .where(
        and(
          eq(voterTasks.voterId, voterId),
          eq(beneficiaryServices.serviceType, 'community')
        )
      )
      .orderBy(desc(beneficiaryServices.createdAt));

    const communityServices = communityTasks.map(row => row.service);

    return {
      individual: individualServices,
      community: communityServices,
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voter beneficiary services',
    );
  }
}

export async function getVoterDailyProgrammeEvents(contactNumbers: string[]): Promise<Array<DailyProgramme & { visitorName: string }>> {
  try {
    if (contactNumbers.length === 0) {
      return [];
    }

    // Filter out null/undefined/empty contact numbers
    const validContactNumbers = contactNumbers.filter(cn => cn && cn.trim().length > 0);

    if (validContactNumbers.length === 0) {
      return [];
    }

    const visitors = await db
      .select({
        visitor,
        programmeEvent: dailyProgramme,
      })
      .from(visitor)
      .leftJoin(dailyProgramme, eq(visitor.programmeEventId, dailyProgramme.id))
      .where(inArray(visitor.contactNumber, validContactNumbers))
      .orderBy(desc(visitor.visitDate));

    // Filter out visitors without programme events and map to the expected format
    return visitors
      .filter(row => row.programmeEvent !== null)
      .map(row => ({
        ...row.programmeEvent!,
        visitorName: row.visitor.name,
      }));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voter daily programme events',
    );
  }
}

export async function getRelatedVotersServicesAndEvents(relatedVoters: Array<VoterWithPartNo>): Promise<Array<{
  voter: VoterWithPartNo;
  services: {
    individual: Array<BeneficiaryService>;
    community: Array<BeneficiaryService>;
  };
  events: Array<DailyProgramme & { visitorName: string }>;
}>> {
  try {
    if (relatedVoters.length === 0) {
      return [];
    }

    const results = await Promise.all(
      relatedVoters.map(async (voter) => {
        // Get services for this voter
        const services = await getVoterBeneficiaryServices(voter.epicNumber);

        // Get events for this voter (using their contact numbers)
        const contactNumbers: string[] = [];
        if (voter.mobileNoPrimary) contactNumbers.push(voter.mobileNoPrimary);
        if (voter.mobileNoSecondary) contactNumbers.push(voter.mobileNoSecondary);
        const events = await getVoterDailyProgrammeEvents(contactNumbers);

        return {
          voter,
          services,
          events,
        };
      })
    );

    return results;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get related voters services and events',
    );
  }
}

export async function getTasksWithFilters({
  status,
  priority,
  token,
  mobileNo,
  voterId,
  page = 1,
  limit = 10,
  assignedTo,
  serviceType,
}: {
  status?: string;
  priority?: string;
  token?: string;
  mobileNo?: string;
  voterId?: string;
  page?: number;
  limit?: number;
  assignedTo?: string;
  serviceType?: 'individual' | 'community';
}): Promise<{
  tasks: Array<VoterTask & {
    service?: {
      id: string;
      serviceType: 'individual' | 'community' | null;
      serviceName: string | null;
      description: string | null;
      status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | null;
      priority: 'low' | 'medium' | 'high' | 'urgent' | null;
      token: string | null;
      createdAt: Date | null;
      updatedAt: Date | null;
      completedAt: Date | null;
      notes: string | null;
    };
    voter?: {
      epicNumber: string;
      fullName: string | null;
      mobileNoPrimary: string | null;
      mobileNoSecondary: string | null;
      age: number | null;
      gender: string | null;
      relationName: string | null;
      partNo: string | null;
      wardNo: string | null;
      acNo: string | null;
      boothName: string | null;
    };
  }>;
  totalCount: number;
  totalPages: number;
  currentPage: number;
}> {
  try {
    const offset = (page - 1) * limit;

    // For individual services, query BeneficiaryService directly
    // For community services or when serviceType is not specified, use legacy VoterTask approach
    if (serviceType === 'individual' || !serviceType) {
      // Build where conditions for services
      const whereConditions: SQL[] = [eq(beneficiaryServices.serviceType, 'individual')];

      if (status) {
        whereConditions.push(eq(beneficiaryServices.status, status as any));
      }

      if (priority) {
        whereConditions.push(eq(beneficiaryServices.priority, priority as any));
      }

      if (assignedTo) {
        whereConditions.push(eq(beneficiaryServices.assignedTo, assignedTo));
      }

      if (voterId) {
        whereConditions.push(eq(beneficiaryServices.voterId, voterId));
      }

      if (token) {
        whereConditions.push(eq(beneficiaryServices.token, token));
      }

      // Get total count
      // Need voter join for mobile number filter
      const needsVoterJoinForCount = !!mobileNo;
      const totalCountQuery = needsVoterJoinForCount
        ? db
          .select({ count: count() })
          .from(beneficiaryServices)
          .leftJoin(Voters, eq(beneficiaryServices.voterId, Voters.epicNumber))
          .where(whereConditions.length > 0 ? and(...whereConditions,
            mobileNo ? or(
              eq(Voters.mobileNoPrimary, mobileNo),
              eq(Voters.mobileNoSecondary, mobileNo)
            ) : sql`1=1`
          ) : sql`1=1`)
        : db
          .select({ count: count() })
          .from(beneficiaryServices)
          .where(whereConditions.length > 0 ? and(...whereConditions) : sql`1=1`);

      const totalCountResult = await totalCountQuery;
      const totalCount = totalCountResult[0]?.count || 0;
      const totalPages = Math.ceil(totalCount / limit);

      // Get services with voter information
      const servicesQuery = db
        .select({
          // Service fields
          serviceId: beneficiaryServices.id,
          serviceType: beneficiaryServices.serviceType,
          serviceName: beneficiaryServices.serviceName,
          serviceDescription: beneficiaryServices.description,
          serviceStatus: beneficiaryServices.status,
          servicePriority: beneficiaryServices.priority,
          serviceToken: beneficiaryServices.token,
          serviceCreatedAt: beneficiaryServices.createdAt,
          serviceUpdatedAt: beneficiaryServices.updatedAt,
          serviceCompletedAt: beneficiaryServices.completedAt,
          serviceNotes: beneficiaryServices.notes,
          serviceAssignedTo: beneficiaryServices.assignedTo,
          serviceRequestedBy: beneficiaryServices.requestedBy,
          // Voter fields
          voterId: beneficiaryServices.voterId,
          voterName: Voters.fullName,
          voterMobilePrimary: Voters.mobileNoPrimary,
          voterMobileSecondary: Voters.mobileNoSecondary,
          voterAge: Voters.age,
          voterGender: Voters.gender,
          voterRelation: Voters.relationName,
          voterPartNo: Voters.partNo,
          voterAcNo: Voters.acNo,
          // PartNo fields
          voterWardNo: PartNo.wardNo,
          voterBoothName: PartNo.boothName,
        })
        .from(beneficiaryServices)
        .leftJoin(Voters, eq(beneficiaryServices.voterId, Voters.epicNumber))
        .leftJoin(PartNo, eq(Voters.partNo, PartNo.partNo))
        .where(whereConditions.length > 0 ? and(...whereConditions) : sql`1=1`)
        .orderBy(desc(beneficiaryServices.createdAt))
        .limit(limit)
        .offset(offset);

      const results = await servicesQuery;

      // Transform results to match expected structure (using service data as primary)
      const tasks = results.map(row => ({
        id: row.serviceId, // Use service ID as the primary identifier
        serviceId: row.serviceId,
        voterId: row.voterId || '',
        taskType: 'service_request', // Default task type for services
        description: row.serviceDescription || null,
        status: row.serviceStatus || 'pending', // Use service status
        priority: row.servicePriority || 'medium', // Use service priority
        assignedTo: row.serviceAssignedTo || null,
        createdBy: row.serviceRequestedBy || null,
        updatedBy: null,
        createdAt: row.serviceCreatedAt || new Date(),
        updatedAt: row.serviceUpdatedAt || new Date(),
        completedAt: row.serviceCompletedAt || null,
        notes: row.serviceNotes || null,
        service: {
          id: row.serviceId,
          serviceType: row.serviceType,
          serviceName: row.serviceName,
          description: row.serviceDescription,
          status: row.serviceStatus,
          priority: row.servicePriority,
          token: row.serviceToken,
          createdAt: row.serviceCreatedAt,
          updatedAt: row.serviceUpdatedAt,
          completedAt: row.serviceCompletedAt,
          notes: row.serviceNotes,
        },
        voter: row.voterId ? {
          epicNumber: row.voterId,
          fullName: row.voterName,
          mobileNoPrimary: row.voterMobilePrimary,
          mobileNoSecondary: row.voterMobileSecondary,
          age: row.voterAge,
          gender: row.voterGender,
          relationName: row.voterRelation,
          partNo: row.voterPartNo,
          wardNo: row.voterWardNo,
          acNo: row.voterAcNo,
          boothName: row.voterBoothName,
        } : undefined,
      }));

      return {
        tasks,
        totalCount,
        totalPages,
        currentPage: page,
      };
    }

    // Legacy path for community services (still uses VoterTask)
    // This is kept for backward compatibility during transition
    const whereConditions: SQL[] = [];

    if (status) {
      whereConditions.push(eq(voterTasks.status, status as any));
    }

    if (priority) {
      whereConditions.push(eq(voterTasks.priority, priority as any));
    }

    if (assignedTo) {
      whereConditions.push(eq(voterTasks.assignedTo, assignedTo));
    }

    if (voterId) {
      whereConditions.push(eq(voterTasks.voterId, voterId));
    }

    const finalWhereConditions = [...whereConditions];

    if (token) {
      finalWhereConditions.push(eq(beneficiaryServices.token, token));
    }

    if (serviceType === 'community') {
      finalWhereConditions.push(eq(beneficiaryServices.serviceType, 'community'));
    }

    if (mobileNo) {
      const mobileCondition = or(
        eq(Voters.mobileNoPrimary, mobileNo),
        eq(Voters.mobileNoSecondary, mobileNo)
      );
      if (mobileCondition) {
        finalWhereConditions.push(mobileCondition);
      }
    }

    const needsJoins = !!(token || serviceType || mobileNo);

    const totalCountResult = needsJoins
      ? await db
        .select({ count: count() })
        .from(voterTasks)
        .leftJoin(beneficiaryServices, eq(voterTasks.serviceId, beneficiaryServices.id))
        .leftJoin(Voters, eq(voterTasks.voterId, Voters.epicNumber))
        .where(finalWhereConditions.length > 0 ? and(...finalWhereConditions) : sql`1=1`)
      : await db
        .select({ count: count() })
        .from(voterTasks)
        .where(finalWhereConditions.length > 0 ? and(...finalWhereConditions) : sql`1=1`);

    const totalCount = totalCountResult[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    const query = db
      .select({
        id: voterTasks.id,
        serviceId: voterTasks.serviceId,
        voterId: voterTasks.voterId,
        taskType: voterTasks.taskType,
        description: voterTasks.description,
        status: voterTasks.status,
        priority: voterTasks.priority,
        assignedTo: voterTasks.assignedTo,
        createdBy: voterTasks.createdBy,
        updatedBy: voterTasks.updatedBy,
        createdAt: voterTasks.createdAt,
        updatedAt: voterTasks.updatedAt,
        completedAt: voterTasks.completedAt,
        notes: voterTasks.notes,
        serviceType: beneficiaryServices.serviceType,
        serviceName: beneficiaryServices.serviceName,
        serviceDescription: beneficiaryServices.description,
        serviceStatus: beneficiaryServices.status,
        servicePriority: beneficiaryServices.priority,
        serviceToken: beneficiaryServices.token,
        serviceCreatedAt: beneficiaryServices.createdAt,
        serviceUpdatedAt: beneficiaryServices.updatedAt,
        serviceCompletedAt: beneficiaryServices.completedAt,
        serviceNotes: beneficiaryServices.notes,
        voterName: Voters.fullName,
        voterMobilePrimary: Voters.mobileNoPrimary,
        voterMobileSecondary: Voters.mobileNoSecondary,
        voterAge: Voters.age,
        voterGender: Voters.gender,
        voterRelation: Voters.relationName,
        voterPartNo: Voters.partNo,
        voterAcNo: Voters.acNo,
        voterWardNo: PartNo.wardNo,
        voterBoothName: PartNo.boothName,
      })
      .from(voterTasks)
      .leftJoin(beneficiaryServices, eq(voterTasks.serviceId, beneficiaryServices.id))
      .leftJoin(Voters, eq(voterTasks.voterId, Voters.epicNumber))
      .leftJoin(PartNo, eq(Voters.partNo, PartNo.partNo))
      .where(finalWhereConditions.length > 0 ? and(...finalWhereConditions) : sql`1=1`)
      .orderBy(desc(voterTasks.createdAt))
      .limit(limit)
      .offset(offset);

    const results = await query;

    const tasks = results.map(row => ({
      id: row.id,
      serviceId: row.serviceId,
      voterId: row.voterId,
      taskType: row.taskType,
      description: row.description,
      status: row.status,
      priority: row.priority,
      assignedTo: row.assignedTo,
      createdBy: row.createdBy,
      updatedBy: row.updatedBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt,
      notes: row.notes,
      service: row.serviceId ? {
        id: row.serviceId,
        serviceType: row.serviceType,
        serviceName: row.serviceName,
        description: row.serviceDescription,
        status: row.serviceStatus,
        priority: row.servicePriority,
        token: row.serviceToken,
        createdAt: row.serviceCreatedAt,
        updatedAt: row.serviceUpdatedAt,
        completedAt: row.serviceCompletedAt,
        notes: row.serviceNotes,
      } : undefined,
      voter: row.voterId ? {
        epicNumber: row.voterId,
        fullName: row.voterName,
        mobileNoPrimary: row.voterMobilePrimary,
        mobileNoSecondary: row.voterMobileSecondary,
        age: row.voterAge,
        gender: row.voterGender,
        relationName: row.voterRelation,
        partNo: row.voterPartNo,
        wardNo: row.voterWardNo,
        acNo: row.voterAcNo,
        boothName: row.voterBoothName,
      } : undefined,
    }));

    return {
      tasks,
      totalCount,
      totalPages,
      currentPage: page,
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get tasks with filters',
    );
  }
}

export async function getVoterTaskById(id: string): Promise<VoterTask | null> {
  try {
    const [task] = await db
      .select()
      .from(voterTasks)
      .where(eq(voterTasks.id, id))
      .limit(1);

    return task || null;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voter task by id',
    );
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
    // Get current task to track changes
    const currentTask = await getVoterTaskById(id);
    if (!currentTask) {
      return null;
    }

    const updateData: Partial<VoterTask> = {
      status,
      updatedAt: new Date(),
    };

    if (priority) updateData.priority = priority;
    if (notes) updateData.notes = notes;
    if (assignedTo) updateData.assignedTo = assignedTo;
    if (updatedBy) updateData.updatedBy = updatedBy;
    if (status === 'completed') updateData.completedAt = new Date();

    const [updatedTask] = await db
      .update(voterTasks)
      .set(updateData)
      .where(eq(voterTasks.id, id))
      .returning();

    // Create history entries for changes
    if (performedBy) {
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
      }
    }

    return updatedTask || null;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update voter task status',
    );
  }
}

// Community Service Area queries
export async function createCommunityServiceAreas({
  serviceId,
  areas,
}: {
  serviceId: string;
  areas: Array<{
    partNo?: string;
    wardNo?: string;
    acNo?: string;
  }>;
}): Promise<Array<CommunityServiceArea>> {
  try {
    const areaData = areas.map(area => ({
      serviceId,
      partNo: area.partNo,
      wardNo: area.wardNo,
      acNo: area.acNo,
      createdAt: new Date(),
    }));

    return await db
      .insert(communityServiceAreas)
      .values(areaData)
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create community service areas',
    );
  }
}

export async function getCommunityServiceAreasByServiceId(serviceId: string): Promise<Array<CommunityServiceArea>> {
  try {
    return await db
      .select()
      .from(communityServiceAreas)
      .where(eq(communityServiceAreas.serviceId, serviceId))
      .orderBy(asc(communityServiceAreas.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get community service areas by service id',
    );
  }
}

export async function getCommunityServicesWithAreas({
  status,
  priority,
  token,
  page = 1,
  limit = 10,
}: {
  status?: string;
  priority?: string;
  token?: string;
  page?: number;
  limit?: number;
}): Promise<{
  services: Array<BeneficiaryService & {
    areas: Array<CommunityServiceArea>;
  }>;
  totalCount: number;
  totalPages: number;
  currentPage: number;
}> {
  try {
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions: SQL[] = [eq(beneficiaryServices.serviceType, 'community')];

    if (status) {
      whereConditions.push(eq(beneficiaryServices.status, status as any));
    }

    if (priority) {
      whereConditions.push(eq(beneficiaryServices.priority, priority as any));
    }

    if (token) {
      whereConditions.push(eq(beneficiaryServices.token, token));
    }

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: count() })
      .from(beneficiaryServices)
      .where(and(...whereConditions));

    const totalCount = totalCountResult[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Get services
    const services = await db
      .select()
      .from(beneficiaryServices)
      .where(and(...whereConditions))
      .orderBy(desc(beneficiaryServices.createdAt))
      .limit(limit)
      .offset(offset);

    // Get areas for each service
    const servicesWithAreas = await Promise.all(
      services.map(async (service) => {
        const areas = await getCommunityServiceAreasByServiceId(service.id);
        return {
          ...service,
          areas,
        };
      })
    );

    return {
      services: servicesWithAreas,
      totalCount,
      totalPages,
      currentPage: page,
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get community services with areas',
    );
  }
}

// Task History queries
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
    const [historyEntry] = await db
      .insert(taskHistory)
      .values({
        taskId,
        action,
        oldValue,
        newValue,
        performedBy,
        notes,
        createdAt: new Date(),
      })
      .returning();

    return historyEntry;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create task history entry',
    );
  }
}

export async function getTaskHistory(taskId: string): Promise<Array<TaskHistory>> {
  try {
    return await db
      .select()
      .from(taskHistory)
      .where(eq(taskHistory.taskId, taskId))
      .orderBy(desc(taskHistory.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get task history',
    );
  }
}

// Module Permissions Queries
export async function getUserModulePermissions(userId: string): Promise<Record<string, boolean>> {
  try {
    const permissions = await db
      .select()
      .from(userModulePermissions)
      .where(eq(userModulePermissions.userId, userId));

    const result: Record<string, boolean> = {};
    for (const perm of permissions) {
      result[perm.moduleKey] = perm.hasAccess;
    }
    return result;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get user module permissions',
    );
  }
}

export async function getAllUsersWithPermissions(): Promise<Array<User & { permissions: Record<string, boolean>; roleInfo?: Role | null }>> {
  try {
    const users = await db.select().from(user).orderBy(asc(user.userId));
    const allPermissions = await db.select().from(userModulePermissions);

    // Get all roles
    const allRoles = await db.select().from(role);
    const rolesById = new Map(allRoles.map((r) => [r.id, r]));

    // Get all role permissions
    const allRolePermissions = await db.select().from(roleModulePermissions);
    const rolePermissionsByRoleId: Record<string, Record<string, boolean>> = {};
    for (const perm of allRolePermissions) {
      if (!rolePermissionsByRoleId[perm.roleId]) {
        rolePermissionsByRoleId[perm.roleId] = {};
      }
      rolePermissionsByRoleId[perm.roleId][perm.moduleKey] = perm.hasAccess;
    }

    // Group user-specific permissions by userId (for backward compatibility)
    const permissionsByUser: Record<string, Record<string, boolean>> = {};
    for (const perm of allPermissions) {
      if (!permissionsByUser[perm.userId]) {
        permissionsByUser[perm.userId] = {};
      }
      permissionsByUser[perm.userId][perm.moduleKey] = perm.hasAccess;
    }

    return users.map((u) => {
      // Get role permissions if user has a role
      const userPermissions: Record<string, boolean> = {};
      if (u.roleId) {
        const rolePerms = rolePermissionsByRoleId[u.roleId] || {};
        Object.assign(userPermissions, rolePerms);
      }

      // Merge user-specific permissions (for backward compatibility/overrides)
      Object.assign(userPermissions, permissionsByUser[u.id] || {});

      return {
        ...u,
        permissions: userPermissions,
        roleInfo: u.roleId ? rolesById.get(u.roleId) || null : null,
      };
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get all users with permissions',
    );
  }
}

export async function updateUserModulePermissions(
  userId: string,
  permissions: Record<string, boolean>,
): Promise<void> {
  try {
    // Delete existing permissions for this user
    await db
      .delete(userModulePermissions)
      .where(eq(userModulePermissions.userId, userId));

    // Insert new permissions
    const permissionEntries = Object.entries(permissions).map(([moduleKey, hasAccess]) => ({
      userId,
      moduleKey,
      hasAccess,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    if (permissionEntries.length > 0) {
      await db.insert(userModulePermissions).values(permissionEntries);
    }
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update user module permissions',
    );
  }
}

export async function hasModuleAccess(userId: string, moduleKey: string): Promise<boolean> {
  try {
    const moduleKeysToCheck =
      moduleKey === 'daily-programme' || moduleKey === 'calendar'
        ? ['daily-programme', 'calendar']
        : [moduleKey];

    // Optimized: Check both user and role permissions in parallel using Promise.all
    // This is faster than sequential checks and simpler than complex UNION queries
    const moduleKeyCondition =
      moduleKeysToCheck.length === 1
        ? eq(userModulePermissions.moduleKey, moduleKeysToCheck[0]!)
        : inArray(userModulePermissions.moduleKey, moduleKeysToCheck);

    const roleModuleKeyCondition =
      moduleKeysToCheck.length === 1
        ? eq(roleModulePermissions.moduleKey, moduleKeysToCheck[0]!)
        : inArray(roleModulePermissions.moduleKey, moduleKeysToCheck);

    // Get user with role in a single query, then check permissions in parallel
    const [userRecord] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!userRecord) {
      return false;
    }

    // Check both user-specific and role-based permissions in parallel
    const [userPermission, rolePermission] = await Promise.all([
      // Check user-specific permissions
      db
        .select()
        .from(userModulePermissions)
        .where(
          and(
            eq(userModulePermissions.userId, userId),
            eq(userModulePermissions.hasAccess, true),
            moduleKeyCondition,
          ),
        )
        .limit(1),
      // Check role-based permissions (only if user has a role)
      userRecord.roleId
        ? db
          .select()
          .from(roleModulePermissions)
          .where(
            and(
              eq(roleModulePermissions.roleId, userRecord.roleId),
              eq(roleModulePermissions.hasAccess, true),
              roleModuleKeyCondition,
            ),
          )
          .limit(1)
        : Promise.resolve([]),
    ]);

    // Return true if either permission check found access
    return (
      userPermission.length > 0 ||
      (rolePermission.length > 0 && rolePermission[0]?.hasAccess === true)
    );
  } catch (error) {
    console.error('Error checking module access:', error);
    // If table doesn't exist or there's a schema issue, return false instead of throwing
    // This allows the system to work even if permissions haven't been set up yet
    if (error instanceof Error && error.message.includes('does not exist')) {
      return false;
    }
    throw new ChatSDKError(
      'bad_request:database',
      `Failed to check module access: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

export async function createUserWithPermissions(
  userIdValue: string,
  password: string,
  _roleEnum: never, // Deprecated parameter, kept for backward compatibility
  permissions: Record<string, boolean>,
  roleId?: string | null,
): Promise<User> {
  try {
    const hashedPassword = generateHashedPassword(password);
    const [newUser] = await db
      .insert(user)
      .values({
        userId: userIdValue,
        password: hashedPassword,
        roleId: roleId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Create user-specific permissions (only if provided, role permissions are handled via roleId)
    if (Object.keys(permissions).length > 0) {
      const permissionEntries = Object.entries(permissions).map(([moduleKey, hasAccess]) => ({
        userId: newUser.id,
        moduleKey,
        hasAccess,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await db.insert(userModulePermissions).values(permissionEntries);
    }

    return newUser;
  } catch (error) {
    console.error('Error creating user with permissions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new ChatSDKError(
      'bad_request:database',
      `Failed to create user with permissions: ${errorMessage}`,
    );
  }
}

export async function deleteUser(userId: string): Promise<void> {
  try {
    // Permissions will be deleted via cascade
    await db.delete(user).where(eq(user.id, userId));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete user',
    );
  }
}

// Helper to format Date to YYYY-MM-DD string
function formatDateToString(date: Date | string): string {
  if (typeof date === 'string') return date;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Daily Programme Queries
export async function createDailyProgrammeItem({
  date,
  startTime,
  endTime,
  title,
  location,
  remarks,
  createdBy,
}: {
  date: Date | string;
  startTime: string;
  endTime?: string;
  title: string;
  location: string;
  remarks?: string;
  createdBy: string;
}): Promise<DailyProgramme> {
  try {
    const [item] = await db
      .insert(dailyProgramme)
      .values({
        date: formatDateToString(date),
        startTime,
        endTime: endTime || null,
        title,
        location,
        remarks: remarks || null,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return item;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create daily programme item',
    );
  }
}

export async function getDailyProgrammeItems({
  startDate,
  endDate,
  limit = 100,
}: {
  startDate?: Date | string;
  endDate?: Date | string;
  limit?: number;
} = {}): Promise<Array<DailyProgramme & { createdByUserId?: string | null; updatedByUserId?: string | null }>> {
  try {
    const conditions: SQL[] = [];
    if (startDate) {
      conditions.push(gte(dailyProgramme.date, formatDateToString(startDate)));
    }
    if (endDate) {
      conditions.push(lte(dailyProgramme.date, formatDateToString(endDate)));
    }

    // Use SQL aliases for joining user table twice
    const createdByUser = sql`${user}`.as('created_by_user');
    const updatedByUser = sql`${user}`.as('updated_by_user');

    const results = await db
      .select({
        id: dailyProgramme.id,
        date: dailyProgramme.date,
        startTime: dailyProgramme.startTime,
        endTime: dailyProgramme.endTime,
        title: dailyProgramme.title,
        location: dailyProgramme.location,
        remarks: dailyProgramme.remarks,
        attended: dailyProgramme.attended,
        createdBy: dailyProgramme.createdBy,
        updatedBy: dailyProgramme.updatedBy,
        createdAt: dailyProgramme.createdAt,
        updatedAt: dailyProgramme.updatedAt,
        createdByUserId: sql<string | null>`created_by_user.user_id`,
        updatedByUserId: sql<string | null>`updated_by_user.user_id`,
      })
      .from(dailyProgramme)
      .leftJoin(sql`${user} AS created_by_user`, sql`${dailyProgramme.createdBy} = created_by_user.id`)
      .leftJoin(sql`${user} AS updated_by_user`, sql`${dailyProgramme.updatedBy} = updated_by_user.id`)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(dailyProgramme.date), asc(dailyProgramme.startTime))
      .limit(limit);

    return results;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get daily programme items',
    );
  }
}

export async function getDailyProgrammeItemById(id: string): Promise<DailyProgramme | null> {
  try {
    const [item] = await db
      .select()
      .from(dailyProgramme)
      .where(eq(dailyProgramme.id, id))
      .limit(1);

    return item || null;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get daily programme item',
    );
  }
}

export async function updateDailyProgrammeItem(
  id: string,
  data: Partial<Omit<DailyProgramme, 'id' | 'createdBy' | 'createdAt'>>,
  updatedBy?: string,
): Promise<DailyProgramme | null> {
  try {
    // Format date if it's a Date object (schema expects string)
    const updateData: any = { ...data };
    if (updateData.date && updateData.date instanceof Date) {
      updateData.date = formatDateToString(updateData.date);
    }

    // Normalize empty strings to null for nullable fields
    if (updateData.endTime === '') {
      updateData.endTime = null;
    }
    if (updateData.remarks === '') {
      updateData.remarks = null;
    }

    if (updatedBy) {
      updateData.updatedBy = updatedBy;
    }

    const [updated] = await db
      .update(dailyProgramme)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(dailyProgramme.id, id))
      .returning();

    return updated || null;
  } catch (error) {
    console.error('Database error updating daily programme item:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new ChatSDKError(
      'bad_request:database',
      errorMessage,
    );
  }
}

export async function deleteDailyProgrammeItem(id: string): Promise<void> {
  try {
    await db.delete(dailyProgramme).where(eq(dailyProgramme.id, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete daily programme item',
    );
  }
}

// Daily Programme Attachment Queries
export async function getDailyProgrammeAttachments(programmeId: string): Promise<Array<DailyProgrammeAttachment>> {
  try {
    return await db
      .select()
      .from(dailyProgrammeAttachment)
      .where(eq(dailyProgrammeAttachment.programmeId, programmeId))
      .orderBy(asc(dailyProgrammeAttachment.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get daily programme attachments',
    );
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
    const [attachment] = await db
      .insert(dailyProgrammeAttachment)
      .values({
        programmeId,
        fileName,
        fileSizeKb,
        fileUrl: fileUrl || null,
        createdAt: new Date(),
      })
      .returning();

    return attachment;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create daily programme attachment',
    );
  }
}

export async function deleteDailyProgrammeAttachment(id: string): Promise<void> {
  try {
    await db.delete(dailyProgrammeAttachment).where(eq(dailyProgrammeAttachment.id, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete daily programme attachment',
    );
  }
}

export async function getDailyProgrammeAttachmentById(id: string): Promise<DailyProgrammeAttachment | null> {
  try {
    const [attachment] = await db
      .select()
      .from(dailyProgrammeAttachment)
      .where(eq(dailyProgrammeAttachment.id, id))
      .limit(1);
    return attachment || null;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get daily programme attachment',
    );
  }
}

// Register Entry Queries
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
  documentType?: 'VIP' | 'Department' | 'General';
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
    const [entry] = await db
      .insert(registerEntry)
      .values({
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
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return entry;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create register entry',
    );
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
    const conditions: SQL[] = [];
    if (type) {
      conditions.push(eq(registerEntry.type, type));
    }
    if (startDate) {
      conditions.push(gte(registerEntry.date, formatDateToString(startDate)));
    }
    if (endDate) {
      conditions.push(lte(registerEntry.date, formatDateToString(endDate)));
    }

    return await db
      .select()
      .from(registerEntry)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(registerEntry.date), desc(registerEntry.createdAt))
      .limit(limit);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get register entries',
    );
  }
}

// Get register entries with attachments in a single query (fixes N+1)
export async function getRegisterEntriesWithAttachments({
  type,
  startDate,
  endDate,
  projectIds,
  projectStatus,
  limit = 100,
}: {
  type?: 'inward' | 'outward';
  startDate?: Date | string;
  endDate?: Date | string;
  projectIds?: string[];
  projectStatus?: 'Concept' | 'Proposal' | 'In Progress' | 'Completed';
  limit?: number;
} = {}): Promise<Array<RegisterEntry & { attachments: RegisterAttachment[] }>> {
  try {
    const conditions: SQL[] = [];
    if (type) {
      conditions.push(eq(registerEntry.type, type));
    }
    if (startDate) {
      conditions.push(gte(registerEntry.date, formatDateToString(startDate)));
    }
    if (endDate) {
      conditions.push(lte(registerEntry.date, formatDateToString(endDate)));
    }
    if (projectIds && projectIds.length > 0) {
      conditions.push(inArray(registerEntry.projectId, projectIds));
    }

    // Get entries with their attachments using a left join
    // Also join with mlaProject if filtering by project status
    let query = db
      .select({
        entry: registerEntry,
        attachment: registerAttachment,
      })
      .from(registerEntry)
      .leftJoin(registerAttachment, eq(registerEntry.id, registerAttachment.entryId));

    // Join with mlaProject if filtering by project status
    if (projectStatus) {
      query = query.leftJoin(mlaProject, eq(registerEntry.projectId, mlaProject.id));
      conditions.push(eq(mlaProject.status, projectStatus));
    }

    const results = await query
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(registerEntry.date), desc(registerEntry.createdAt))
      .limit(limit * 10); // Account for multiple attachments per entry

    // Group attachments by entry
    const entriesMap = new Map<string, RegisterEntry & { attachments: RegisterAttachment[] }>();

    for (const row of results) {
      if (!entriesMap.has(row.entry.id)) {
        entriesMap.set(row.entry.id, { ...row.entry, attachments: [] });
      }
      if (row.attachment) {
        entriesMap.get(row.entry.id)!.attachments.push(row.attachment);
      }
    }

    // Convert to array and apply limit
    return Array.from(entriesMap.values()).slice(0, limit);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get register entries with attachments',
    );
  }
}

export async function getRegisterEntriesByProjectId(projectId: string): Promise<Array<RegisterEntry>> {
  try {
    return await db
      .select()
      .from(registerEntry)
      .where(eq(registerEntry.projectId, projectId))
      .orderBy(desc(registerEntry.date), desc(registerEntry.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get register entries for project',
    );
  }
}

export async function getRegisterEntryById(id: string): Promise<RegisterEntry | null> {
  try {
    const [entry] = await db
      .select()
      .from(registerEntry)
      .where(eq(registerEntry.id, id))
      .limit(1);

    return entry || null;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get register entry',
    );
  }
}

export async function updateRegisterEntry(
  id: string,
  data: Partial<Omit<RegisterEntry, 'id' | 'createdBy' | 'createdAt'>>,
): Promise<RegisterEntry | null> {
  try {
    const [updated] = await db
      .update(registerEntry)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(registerEntry.id, id))
      .returning();

    return updated || null;
  } catch (error) {
    console.error('Error updating register entry:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update register entry';
    throw new ChatSDKError(
      'bad_request:database',
      errorMessage,
    );
  }
}

export async function deleteRegisterEntry(id: string): Promise<void> {
  try {
    await db.delete(registerEntry).where(eq(registerEntry.id, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete register entry',
    );
  }
}

export async function getRegisterAttachments(entryId: string): Promise<Array<RegisterAttachment>> {
  try {
    return await db
      .select()
      .from(registerAttachment)
      .where(eq(registerAttachment.entryId, entryId))
      .orderBy(asc(registerAttachment.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get register attachments',
    );
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
    const [attachment] = await db
      .insert(registerAttachment)
      .values({
        entryId,
        fileName,
        fileSizeKb,
        fileUrl: fileUrl || null,
        createdAt: new Date(),
      })
      .returning();

    return attachment;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create register attachment',
    );
  }
}

export async function deleteRegisterAttachment(id: string): Promise<void> {
  try {
    await db.delete(registerAttachment).where(eq(registerAttachment.id, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete register attachment',
    );
  }
}

// Projects Queries
export async function createProject({
  name,
  ward,
  type,
  status,
  createdBy,
}: {
  name: string;
  ward?: string;
  type?: string;
  status?: 'Concept' | 'Proposal' | 'In Progress' | 'Completed';
  createdBy: string;
}): Promise<MlaProject> {
  try {
    const [project] = await db
      .insert(mlaProject)
      .values({
        name,
        ward: ward || null,
        type: type || null,
        status: status || 'Concept',
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return project;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create project',
    );
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
    return await db
      .select()
      .from(mlaProject)
      .where(status ? eq(mlaProject.status, status) : undefined)
      .orderBy(desc(mlaProject.createdAt))
      .limit(limit);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get projects',
    );
  }
}

export async function getProjectById(id: string): Promise<MlaProject | null> {
  try {
    const [project] = await db
      .select()
      .from(mlaProject)
      .where(eq(mlaProject.id, id))
      .limit(1);

    return project || null;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get project',
    );
  }
}

export async function updateProject(
  id: string,
  data: Partial<Omit<MlaProject, 'id' | 'createdBy' | 'createdAt'>>,
): Promise<MlaProject | null> {
  try {
    const [updated] = await db
      .update(mlaProject)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(mlaProject.id, id))
      .returning();

    return updated || null;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update project',
    );
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    await db.delete(mlaProject).where(eq(mlaProject.id, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete project',
    );
  }
}

// Role Management Queries
export async function getAllRoles(): Promise<Array<Role & { permissions: Record<string, boolean> }>> {
  try {
    const roles = await db.select().from(role).orderBy(asc(role.name));

    const rolesWithPermissions = await Promise.all(
      roles.map(async (r) => {
        const permissions = await db
          .select()
          .from(roleModulePermissions)
          .where(eq(roleModulePermissions.roleId, r.id));

        const permissionsMap: Record<string, boolean> = {};
        for (const perm of permissions) {
          permissionsMap[perm.moduleKey] = perm.hasAccess;
        }

        return {
          ...r,
          permissions: permissionsMap,
        };
      }),
    );

    return rolesWithPermissions;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get all roles',
    );
  }
}

export async function getRoleById(roleId: string): Promise<(Role & { permissions: Record<string, boolean> }) | null> {
  try {
    const [roleRecord] = await db
      .select()
      .from(role)
      .where(eq(role.id, roleId))
      .limit(1);

    if (!roleRecord) {
      return null;
    }

    const permissions = await db
      .select()
      .from(roleModulePermissions)
      .where(eq(roleModulePermissions.roleId, roleId));

    const permissionsMap: Record<string, boolean> = {};
    for (const perm of permissions) {
      permissionsMap[perm.moduleKey] = perm.hasAccess;
    }

    return {
      ...roleRecord,
      permissions: permissionsMap,
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get role by id',
    );
  }
}

export async function getRoleAccessibleModules(roleId: string): Promise<string[]> {
  try {
    const permissions = await db
      .select()
      .from(roleModulePermissions)
      .where(
        and(
          eq(roleModulePermissions.roleId, roleId),
          eq(roleModulePermissions.hasAccess, true),
        ),
      );

    return permissions.map((perm) => perm.moduleKey);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get role accessible modules',
    );
  }
}

export async function createRole(
  name: string,
  description: string | null,
  permissions: Record<string, boolean>,
  defaultLandingModule?: string | null,
): Promise<Role> {
  try {
    // Validate defaultLandingModule if provided
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

    const [newRole] = await db
      .insert(role)
      .values({
        name,
        description,
        defaultLandingModule: defaultLandingModule && defaultLandingModule.trim() !== '' ? defaultLandingModule : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Create permissions
    if (Object.keys(permissions).length > 0) {
      const permissionEntries = Object.entries(permissions).map(([moduleKey, hasAccess]) => ({
        roleId: newRole.id,
        moduleKey,
        hasAccess,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await db.insert(roleModulePermissions).values(permissionEntries);
    }

    return newRole;
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create role',
    );
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
    // Validate defaultLandingModule if provided
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

    const [updatedRole] = await db
      .update(role)
      .set({
        name,
        description,
        defaultLandingModule: defaultLandingModule && defaultLandingModule.trim() !== '' ? defaultLandingModule : null,
        updatedAt: new Date(),
      })
      .where(eq(role.id, roleId))
      .returning();

    if (!updatedRole) {
      throw new ChatSDKError(
        'bad_request:database',
        'Role not found',
      );
    }

    // Delete existing permissions
    await db
      .delete(roleModulePermissions)
      .where(eq(roleModulePermissions.roleId, roleId));

    // Insert new permissions
    if (Object.keys(permissions).length > 0) {
      const permissionEntries = Object.entries(permissions).map(([moduleKey, hasAccess]) => ({
        roleId,
        moduleKey,
        hasAccess,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await db.insert(roleModulePermissions).values(permissionEntries);
    }

    return updatedRole;
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update role',
    );
  }
}

export async function deleteRole(roleId: string): Promise<void> {
  try {
    // Check if any users are assigned to this role
    const usersWithRole = await db
      .select()
      .from(user)
      .where(eq(user.roleId, roleId))
      .limit(1);

    if (usersWithRole.length > 0) {
      throw new ChatSDKError(
        'bad_request:database',
        'Cannot delete role: users are still assigned to this role',
      );
    }

    // Permissions will be deleted via cascade
    await db.delete(role).where(eq(role.id, roleId));
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete role',
    );
  }
}

export async function getUsersWithRole(roleId: string): Promise<Array<User>> {
  try {
    return await db
      .select()
      .from(user)
      .where(eq(user.roleId, roleId))
      .orderBy(asc(user.userId));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get users with role',
    );
  }
}

// Visitor Management Queries
export async function createVisitor({
  name,
  contactNumber,
  aadharNumber,
  purpose,
  programmeEventId,
  visitDate,
  createdBy,
}: {
  name: string;
  contactNumber: string;
  aadharNumber: string;
  purpose: string;
  programmeEventId?: string;
  visitDate: Date | string;
  createdBy: string;
}): Promise<Visitor> {
  try {
    const [newVisitor] = await db
      .insert(visitor)
      .values({
        name,
        contactNumber,
        aadharNumber,
        purpose,
        programmeEventId: programmeEventId || null,
        visitDate: typeof visitDate === 'string' ? new Date(visitDate) : visitDate,
        createdBy,
      })
      .returning();

    if (!newVisitor) {
      throw new Error('Failed to create visitor');
    }

    return newVisitor;
  } catch (error) {
    console.error('Database error creating visitor:', error);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create visitor',
    );
  }
}

export async function getVisitors({
  startDate,
  endDate,
  programmeEventId,
}: {
  startDate?: string;
  endDate?: string;
  programmeEventId?: string;
} = {}): Promise<Array<Visitor & { programmeEvent?: DailyProgramme | null }>> {
  try {
    const conditions = [];

    if (startDate) {
      conditions.push(gte(visitor.visitDate, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(visitor.visitDate, new Date(endDate)));
    }
    if (programmeEventId) {
      conditions.push(eq(visitor.programmeEventId, programmeEventId));
    }

    const visitors = await db
      .select({
        visitor,
        programmeEvent: dailyProgramme,
      })
      .from(visitor)
      .leftJoin(dailyProgramme, eq(visitor.programmeEventId, dailyProgramme.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(visitor.visitDate));

    return visitors.map(row => ({
      ...row.visitor,
      programmeEvent: row.programmeEvent,
    }));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get visitors',
    );
  }
}

export async function getVisitorById(id: string): Promise<(Visitor & { programmeEvent?: DailyProgramme | null }) | null> {
  try {
    const [result] = await db
      .select({
        visitor,
        programmeEvent: dailyProgramme,
      })
      .from(visitor)
      .leftJoin(dailyProgramme, eq(visitor.programmeEventId, dailyProgramme.id))
      .where(eq(visitor.id, id))
      .limit(1);

    if (!result) {
      return null;
    }

    return {
      ...result.visitor,
      programmeEvent: result.programmeEvent,
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get visitor',
    );
  }
}

export async function getVisitorsByProgrammeEvent(programmeEventId: string): Promise<Visitor[]> {
  try {
    return await db
      .select()
      .from(visitor)
      .where(eq(visitor.programmeEventId, programmeEventId))
      .orderBy(desc(visitor.visitDate));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get visitors for programme event',
    );
  }
}

export async function getVisitorHistory(contactNumber: string): Promise<Array<Visitor & { programmeEvent?: DailyProgramme | null }>> {
  try {
    const visitors = await db
      .select({
        visitor,
        programmeEvent: dailyProgramme,
      })
      .from(visitor)
      .leftJoin(dailyProgramme, eq(visitor.programmeEventId, dailyProgramme.id))
      .where(eq(visitor.contactNumber, contactNumber))
      .orderBy(desc(visitor.visitDate));

    return visitors.map(row => ({
      ...row.visitor,
      programmeEvent: row.programmeEvent,
    }));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get visitor history',
    );
  }
}

export async function updateVisitor({
  id,
  name,
  contactNumber,
  aadharNumber,
  purpose,
  programmeEventId,
  visitDate,
}: {
  id: string;
  name?: string;
  contactNumber?: string;
  aadharNumber?: string;
  purpose?: string;
  programmeEventId?: string | null;
  visitDate?: Date | string;
}): Promise<Visitor> {
  try {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (contactNumber !== undefined) updateData.contactNumber = contactNumber;
    if (aadharNumber !== undefined) updateData.aadharNumber = aadharNumber;
    if (purpose !== undefined) updateData.purpose = purpose;
    if (programmeEventId !== undefined) updateData.programmeEventId = programmeEventId;
    if (visitDate !== undefined) {
      updateData.visitDate = typeof visitDate === 'string' ? new Date(visitDate) : visitDate;
    }

    const [updated] = await db
      .update(visitor)
      .set(updateData)
      .where(eq(visitor.id, id))
      .returning();

    if (!updated) {
      throw new Error('Visitor not found');
    }

    return updated;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update visitor',
    );
  }
}

export async function deleteVisitor(id: string): Promise<void> {
  try {
    await db.delete(visitor).where(eq(visitor.id, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete visitor',
    );
  }
}

// Export Job Queries
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
    const [job] = await db
      .insert(exportJob)
      .values({
        type,
        format,
        filters: filters || {},
        status: 'pending',
        progress: 0,
        createdBy,
      })
      .returning();
    return job;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create export job');
  }
}

export async function getExportJobById(id: string): Promise<ExportJob | null> {
  try {
    const [job] = await db
      .select()
      .from(exportJob)
      .where(eq(exportJob.id, id));
    return job || null;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get export job');
  }
}

export async function getExportJobsByUser(userId: string, limit = 10): Promise<ExportJob[]> {
  try {
    return await db
      .select()
      .from(exportJob)
      .where(eq(exportJob.createdBy, userId))
      .orderBy(desc(exportJob.createdAt))
      .limit(limit);
  } catch (error) {
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
    const updateData: Partial<ExportJob> = {
      updatedAt: new Date(),
    };

    if (status !== undefined) updateData.status = status;
    if (progress !== undefined) updateData.progress = progress;
    if (processedRecords !== undefined) updateData.processedRecords = processedRecords;
    if (totalRecords !== undefined) updateData.totalRecords = totalRecords;
    if (fileUrl !== undefined) updateData.fileUrl = fileUrl;
    if (fileName !== undefined) updateData.fileName = fileName;
    if (fileSizeKb !== undefined) updateData.fileSizeKb = fileSizeKb;
    if (errorMessage !== undefined) updateData.errorMessage = errorMessage;
    if (status === 'completed' || status === 'failed') {
      updateData.completedAt = new Date();
    }

    const [updated] = await db
      .update(exportJob)
      .set(updateData)
      .where(eq(exportJob.id, id))
      .returning();

    return updated || null;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update export job');
  }
}

export async function deleteExportJob(id: string): Promise<void> {
  try {
    await db.delete(exportJob).where(eq(exportJob.id, id));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to delete export job');
  }
}

// New query functions for ElectionMapping and VotingHistory

// Get election mappings for a voter
export async function getVoterElectionMappings(
  epicNumber: string,
  electionId?: string
): Promise<Array<ElectionMappingType>> {
  try {
    if (electionId) {
      return await db
        .select()
        .from(ElectionMapping)
        .where(
          and(
            eq(ElectionMapping.epicNumber, epicNumber),
            eq(ElectionMapping.electionId, electionId)
          )
        )
        .orderBy(desc(ElectionMapping.electionId));
    }

    return await db
      .select()
      .from(ElectionMapping)
      .where(eq(ElectionMapping.epicNumber, epicNumber))
      .orderBy(desc(ElectionMapping.electionId));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voter election mappings',
    );
  }
}

// Get voting history for a voter with election mapping (booth info)
export type VotingHistoryWithBooth = Pick<ElectionMappingType, 'epicNumber' | 'electionId' | 'hasVoted'> & {
  boothName: string | null;
  boothAddress: string | null;
  boothNo: string | null;
  srNo: string | null;
};

// Get voting history for a voter
export async function getVoterVotingHistory(
  epicNumber: string,
  electionId?: string
): Promise<Array<VotingHistoryWithBooth>> {
  try {
    const baseQuery = db
      .select({
        epicNumber: ElectionMapping.epicNumber,
        electionId: ElectionMapping.electionId,
        hasVoted: ElectionMapping.hasVoted,
        boothName: BoothMaster.boothName,
        boothAddress: BoothMaster.boothAddress,
        boothNo: ElectionMapping.boothNo,
        srNo: ElectionMapping.srNo,
      })
      .from(ElectionMapping)
      .leftJoin(
        BoothMaster,
        and(
          eq(ElectionMapping.electionId, BoothMaster.electionId),
          eq(ElectionMapping.boothNo, BoothMaster.boothNo)
        )
      );

    if (electionId) {
      return await baseQuery
        .where(
          and(
            eq(ElectionMapping.epicNumber, epicNumber),
            eq(ElectionMapping.electionId, electionId)
          )
        )
        .orderBy(desc(ElectionMapping.electionId));
    }

    return await baseQuery
      .where(eq(ElectionMapping.epicNumber, epicNumber))
      .orderBy(desc(ElectionMapping.electionId));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voter voting history',
    );
  }
}

// Mark voter vote (create or update election mapping)
export async function markVoterVote(
  epicNumber: string,
  electionId: string,
  hasVoted: boolean
): Promise<ElectionMappingType> {
  try {
    const [result] = await db
      .insert(ElectionMapping)
      .values({
        epicNumber,
        electionId,
        hasVoted,
      })
      .onConflictDoUpdate({
        target: [ElectionMapping.epicNumber, ElectionMapping.electionId],
        set: {
          hasVoted,
        },
      })
      .returning();

    return result;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to mark voter vote',
    );
  }
}

// Bulk mark voter votes
export async function bulkMarkVoterVotes(
  votes: Array<{ epicNumber: string; electionId: string; hasVoted: boolean }>
): Promise<Array<ElectionMappingType>> {
  try {
    if (votes.length === 0) {
      return [];
    }

    const values = votes.map(vote => ({
      epicNumber: vote.epicNumber,
      electionId: vote.electionId,
      hasVoted: vote.hasVoted,
    }));

    const results = await db
      .insert(ElectionMapping)
      .values(values)
      .onConflictDoUpdate({
        target: [ElectionMapping.epicNumber, ElectionMapping.electionId],
        set: {
          hasVoted: sql`EXCLUDED.has_voted`,
        },
      })
      .returning();

    return results;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to bulk mark voter votes',
    );
  }
}

// Get voting statistics for an election
export async function getVotingStatistics(
  electionId: string,
  filters?: {
    acNo?: string;
    wardNo?: string;
    partNo?: string;
  }
): Promise<{
  totalVoters: number;
  voted: number;
  notVoted: number;
  votingPercentage: number;
}> {
  try {
    // Build filter conditions
    const filterConditions: SQL[] = [];
    if (filters?.acNo) {
      filterConditions.push(eq(BoothMaster.acNo, filters.acNo));
    }
    if (filters?.wardNo) {
      filterConditions.push(eq(BoothMaster.wardNo, filters.wardNo));
    }
    if (filters?.partNo) {
      filterConditions.push(eq(ElectionMapping.boothNo, filters.partNo));
    }

    // Build query with conditional where clause
    const queryBuilder = db
      .select({
        total: count(VoterMaster.epicNumber),
        voted: sql<number>`COUNT(CASE WHEN ${ElectionMapping.hasVoted} = true THEN 1 END)`,
        notVoted: sql<number>`COUNT(CASE WHEN ${ElectionMapping.hasVoted} = false OR ${ElectionMapping.hasVoted} IS NULL THEN 1 END)`,
      })
      .from(VoterMaster)
      .innerJoin(
        ElectionMapping,
        and(
          eq(VoterMaster.epicNumber, ElectionMapping.epicNumber),
          eq(ElectionMapping.electionId, electionId)
        )
      )
      .leftJoin(
        BoothMaster,
        and(
          eq(ElectionMapping.electionId, BoothMaster.electionId),
          eq(ElectionMapping.boothNo, BoothMaster.boothNo)
        )
      );

    // Apply filters if any, otherwise use a condition that's always true
    const query = filterConditions.length > 0
      ? queryBuilder.where(and(...filterConditions))
      : queryBuilder.where(sql`1=1`);

    const [result] = await query;

    const total = Number(result.total) || 0;
    const voted = Number(result.voted) || 0;
    const notVoted = Number(result.notVoted) || 0;
    const votingPercentage = total > 0 ? (voted / total) * 100 : 0;

    return {
      totalVoters: total,
      voted,
      notVoted,
      votingPercentage: Math.round(votingPercentage * 100) / 100,
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voting statistics',
    );
  }
}

// Get voters with optional filters for export
export async function getVotersForExport(filters?: {
  partNo?: string | string[];
  wardNo?: string | string[];
  acNo?: string;
  gender?: string;
  minAge?: number;
  maxAge?: number;
  hasPhone?: boolean;
  religion?: string;
  isVoted2024?: boolean;
}): Promise<Voter[]> {
  try {
    const conditions: SQL<unknown>[] = [];

    const needsPartNoJoin = filters?.wardNo !== undefined;

    if (filters?.partNo) {
      if (Array.isArray(filters.partNo) && filters.partNo.length > 0) {
        conditions.push(inArray(Voters.partNo, filters.partNo));
      } else if (typeof filters.partNo === 'string') {
        conditions.push(eq(Voters.partNo, filters.partNo));
      }
    }
    if (filters?.wardNo) {
      if (Array.isArray(filters.wardNo) && filters.wardNo.length > 0) {
        conditions.push(inArray(PartNo.wardNo, filters.wardNo));
      } else if (typeof filters.wardNo === 'string') {
        conditions.push(eq(PartNo.wardNo, filters.wardNo));
      }
    }
    if (filters?.acNo) {
      conditions.push(eq(Voters.acNo, filters.acNo));
    }
    if (filters?.gender) {
      conditions.push(eq(Voters.gender, filters.gender));
    }
    if (filters?.minAge !== undefined) {
      conditions.push(gte(Voters.age, filters.minAge));
    }
    if (filters?.maxAge !== undefined) {
      conditions.push(lte(Voters.age, filters.maxAge));
    }
    if (filters?.hasPhone === true) {
      conditions.push(
        or(
          sql`${Voters.mobileNoPrimary} IS NOT NULL AND ${Voters.mobileNoPrimary} != ''`,
          sql`${Voters.mobileNoSecondary} IS NOT NULL AND ${Voters.mobileNoSecondary} != ''`
        )!
      );
    }
    if (filters?.hasPhone === false) {
      conditions.push(
        and(
          or(
            sql`${Voters.mobileNoPrimary} IS NULL`,
            eq(Voters.mobileNoPrimary, '')
          ),
          or(
            sql`${Voters.mobileNoSecondary} IS NULL`,
            eq(Voters.mobileNoSecondary, '')
          )
        )!
      );
    }
    if (filters?.religion) {
      conditions.push(eq(Voters.religion, filters.religion));
    }
    if (filters?.isVoted2024 !== undefined) {
      conditions.push(eq(Voters.isVoted2024, filters.isVoted2024));
    }

    if (needsPartNoJoin) {
      if (conditions.length > 0) {
        const results = await db
          .select({
            Voter: Voters,
          })
          .from(Voters)
          .innerJoin(PartNo, eq(Voters.partNo, PartNo.partNo))
          .where(and(...conditions))
          .orderBy(asc(Voters.fullName));
        return results.map((r) => r.Voter);
      }
      const results = await db
        .select({
          Voter: Voters,
        })
        .from(Voters)
        .innerJoin(PartNo, eq(Voters.partNo, PartNo.partNo))
        .orderBy(asc(Voters.fullName));
      return results.map((r) => r.Voter);
    }

    if (conditions.length > 0) {
      return await db
        .select()
        .from(Voters)
        .where(and(...conditions))
        .orderBy(asc(Voters.fullName));
    }

    return await db.select().from(Voters).orderBy(asc(Voters.fullName));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get voters for export');
  }
}

export async function getVotersCountForExport(filters?: {
  partNo?: string | string[];
  wardNo?: string | string[];
  acNo?: string;
  gender?: string;
  minAge?: number;
  maxAge?: number;
  hasPhone?: boolean;
  religion?: string;
  isVoted2024?: boolean;
}): Promise<number> {
  try {
    const conditions: SQL<unknown>[] = [];

    if (filters?.partNo) {
      if (Array.isArray(filters.partNo) && filters.partNo.length > 0) {
        conditions.push(inArray(Voters.partNo, filters.partNo));
      } else if (typeof filters.partNo === 'string') {
        conditions.push(eq(Voters.partNo, filters.partNo));
      }
    }
    const needsPartNoJoin = filters?.wardNo !== undefined;

    if (filters?.wardNo) {
      if (Array.isArray(filters.wardNo) && filters.wardNo.length > 0) {
        conditions.push(inArray(PartNo.wardNo, filters.wardNo));
      } else if (typeof filters.wardNo === 'string') {
        conditions.push(eq(PartNo.wardNo, filters.wardNo));
      }
    }
    if (filters?.acNo) {
      conditions.push(eq(Voters.acNo, filters.acNo));
    }
    if (filters?.gender) {
      conditions.push(eq(Voters.gender, filters.gender));
    }
    if (filters?.minAge !== undefined) {
      conditions.push(gte(Voters.age, filters.minAge));
    }
    if (filters?.maxAge !== undefined) {
      conditions.push(lte(Voters.age, filters.maxAge));
    }
    if (filters?.hasPhone === true) {
      conditions.push(
        or(
          sql`${Voters.mobileNoPrimary} IS NOT NULL AND ${Voters.mobileNoPrimary} != ''`,
          sql`${Voters.mobileNoSecondary} IS NOT NULL AND ${Voters.mobileNoSecondary} != ''`
        )!
      );
    }
    if (filters?.hasPhone === false) {
      conditions.push(
        and(
          or(
            sql`${Voters.mobileNoPrimary} IS NULL`,
            eq(Voters.mobileNoPrimary, '')
          ),
          or(
            sql`${Voters.mobileNoSecondary} IS NULL`,
            eq(Voters.mobileNoSecondary, '')
          )
        )!
      );
    }
    if (filters?.religion) {
      conditions.push(eq(Voters.religion, filters.religion));
    }
    if (filters?.isVoted2024 !== undefined) {
      conditions.push(eq(Voters.isVoted2024, filters.isVoted2024));
    }

    let result;
    if (needsPartNoJoin) {
      if (conditions.length > 0) {
        result = await db
          .select({ count: count() })
          .from(Voters)
          .innerJoin(PartNo, eq(Voters.partNo, PartNo.partNo))
          .where(and(...conditions));
      } else {
        result = await db
          .select({ count: count() })
          .from(Voters)
          .innerJoin(PartNo, eq(Voters.partNo, PartNo.partNo));
      }
    } else {
      if (conditions.length > 0) {
        result = await db
          .select({ count: count() })
          .from(Voters)
          .where(and(...conditions));
      } else {
        result = await db.select({ count: count() }).from(Voters);
      }
    }

    return result[0]?.count || 0;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to count voters for export');
  }
}

// Mobile number with sort order type
export type MobileNumberWithSortOrder = {
  mobileNumber: string;
  sortOrder: number;
};

// Helper function to sync VoterMobileNumber table when mobile numbers are updated
export async function syncVoterMobileNumberTable(
  epicNumber: string,
  mobileNoPrimary: string | null,
  mobileNoSecondary: string | null
): Promise<void> {
  try {
    // Delete existing mobile numbers for this voter
    await db
      .delete(voterMobileNumber)
      .where(eq(voterMobileNumber.epicNumber, epicNumber));

    // Insert new mobile numbers
    const mobileNumbersToInsert: Array<{
      epicNumber: string;
      mobileNumber: string;
      sortOrder: number;
    }> = [];

    if (mobileNoPrimary && mobileNoPrimary.trim()) {
      mobileNumbersToInsert.push({
        epicNumber,
        mobileNumber: mobileNoPrimary.trim(),
        sortOrder: 1,
      });
    }

    if (mobileNoSecondary && mobileNoSecondary.trim()) {
      mobileNumbersToInsert.push({
        epicNumber,
        mobileNumber: mobileNoSecondary.trim(),
        sortOrder: 2,
      });
    }

    if (mobileNumbersToInsert.length > 0) {
      await db.insert(voterMobileNumber).values(mobileNumbersToInsert);
    }
  } catch (error) {
    console.error('Error syncing VoterMobileNumber table:', error);
    // Don't throw - this is a secondary operation, the primary Voter update already succeeded
  }
}

// Get all mobile numbers from VoterMobileNumber table grouped by epic number
export async function getVoterMobileNumbersByEpicNumbers(
  epicNumbers: string[]
): Promise<Map<string, MobileNumberWithSortOrder[]>> {
  try {
    if (epicNumbers.length === 0) {
      return new Map();
    }

    const mobileNumbers = await db
      .select({
        epicNumber: voterMobileNumber.epicNumber,
        mobileNumber: voterMobileNumber.mobileNumber,
        sortOrder: voterMobileNumber.sortOrder,
      })
      .from(voterMobileNumber)
      .where(inArray(voterMobileNumber.epicNumber, epicNumbers))
      .orderBy(asc(voterMobileNumber.epicNumber), asc(voterMobileNumber.sortOrder));

    // Group mobile numbers by epic number with sort order
    const result = new Map<string, MobileNumberWithSortOrder[]>();
    for (const row of mobileNumbers) {
      const existing = result.get(row.epicNumber) || [];
      existing.push({
        mobileNumber: row.mobileNumber,
        sortOrder: row.sortOrder,
      });
      result.set(row.epicNumber, existing);
    }

    return result;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get voter mobile numbers');
  }
}