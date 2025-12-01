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

// Voter-related queries
export async function getVoterByEpicNumber(epicNumber: string): Promise<Array<Voter>> {
  try {
    return await db.select().from(Voters).where(eq(Voters.epicNumber, epicNumber));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voter by EPIC number',
    );
  }
}

export async function getAllVoter(): Promise<Array<Voter>> {
  try {
    return await db.select().from(Voters).orderBy(asc(Voters.fullName));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get all voters',
    );
  }
}

export async function getVoterByAC(acNo: string): Promise<Array<Voter>> {
  try {
    return await db.select().from(Voters).where(eq(Voters.acNo, acNo)).orderBy(asc(Voters.fullName));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voters by AC number',
    );
  }
}

export async function getVoterByWard(wardNo: string): Promise<Array<Voter>> {
  try {
    return await db.select().from(Voters).where(eq(Voters.wardNo, wardNo)).orderBy(asc(Voters.fullName));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voters by ward number',
    );
  }
}

export async function getVoterByPart(partNo: string): Promise<Array<Voter>> {
  try {
    return await db.select().from(Voters).where(eq(Voters.partNo, partNo)).orderBy(asc(Voters.fullName));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voters by part number',
    );
  }
}

export async function getVoterByBooth(boothName: string): Promise<Array<Voter>> {
  try {
    return await db.select().from(Voters).where(eq(Voters.boothName, boothName)).orderBy(asc(Voters.fullName));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voters by booth name',
    );
  }
}

export async function searchVoterByEpicNumber(epicNumber: string): Promise<Array<Voter>> {
  try {
    return await db
      .select()
      .from(Voters)
      .where(sql`LOWER(${Voters.epicNumber}) LIKE LOWER(${`%${epicNumber}%`})`)
      .orderBy(asc(Voters.epicNumber));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to search voters by EPIC number',
    );
  }
}

export async function searchVoterByName(name: string): Promise<Array<Voter>> {
  try {
    return await db
      .select()
      .from(Voters)
      .where(sql`LOWER(${Voters.fullName}) LIKE LOWER(${`%${name}%`})`)
      .orderBy(asc(Voters.fullName));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to search voters by name',
    );
  }
}

export async function searchVoterByPhoneNumber(phoneNumber: string): Promise<Array<Voter>> {
  try {
    // Clean the phone number (remove spaces, dashes, etc.)
    const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');

    return await db
      .select()
      .from(Voters)
      .where(
        sql`(${Voters.mobileNoPrimary} LIKE ${`%${cleanPhone}%`} OR ${Voters.mobileNoSecondary} LIKE ${`%${cleanPhone}%`})`
      )
      .orderBy(asc(Voters.fullName));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to search voters by phone number',
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
}): Promise<Array<Voter>> {
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

    return await db
      .select()
      .from(Voters)
      .where(sql`${sql.join(conditions, sql` AND `)}`)
      .orderBy(asc(Voters.fullName));
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

export async function getRelatedVoters(voter: Voter): Promise<Array<Voter>> {
  try {
    if (!voter.familyGrouping || !voter.partNo) {
      return [];
    }

    const relatedVoters = await db
      .select()
      .from(Voters)
      .where(
        and(
          eq(Voters.familyGrouping, voter.familyGrouping),
          eq(Voters.partNo, voter.partNo),
          ne(Voters.epicNumber, voter.epicNumber),
        ),
      )
      .orderBy(asc(Voters.fullName));

    return relatedVoters;
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
  mobileNoSecondary?: string
): Promise<Voter | null> {
  try {
    const updateData: Partial<Voter> = { updatedAt: new Date() };
    if (mobileNoPrimary !== undefined) updateData.mobileNoPrimary = mobileNoPrimary;
    if (mobileNoSecondary !== undefined) updateData.mobileNoSecondary = mobileNoSecondary;

    const [updatedVoter] = await db
      .update(Voters)
      .set(updateData)
      .where(eq(Voters.epicNumber, epicNumber))
      .returning();

    return updatedVoter || null;
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
  updateData: Partial<Pick<Voter, 'fullName' | 'age' | 'gender' | 'familyGrouping' | 'religion' | 'mobileNoPrimary' | 'mobileNoSecondary' | 'houseNumber' | 'address' | 'pincode' | 'relationType' | 'relationName' | 'isVoted2024'>>
): Promise<Voter | null> {
  try {
    const dataToUpdate: Partial<Voter> = { updatedAt: new Date() };

    if (updateData.fullName !== undefined) {
      dataToUpdate.fullName = updateData.fullName;
    }
    if (updateData.age !== undefined) {
      dataToUpdate.age = updateData.age;
    }
    if (updateData.gender !== undefined) {
      dataToUpdate.gender = updateData.gender;
    }
    if (updateData.familyGrouping !== undefined) {
      dataToUpdate.familyGrouping = updateData.familyGrouping;
    }
    if (updateData.religion !== undefined) {
      dataToUpdate.religion = updateData.religion;
    }
    if (updateData.mobileNoPrimary !== undefined) {
      dataToUpdate.mobileNoPrimary = updateData.mobileNoPrimary;
    }
    if (updateData.mobileNoSecondary !== undefined) {
      dataToUpdate.mobileNoSecondary = updateData.mobileNoSecondary;
    }
    if (updateData.houseNumber !== undefined) {
      dataToUpdate.houseNumber = updateData.houseNumber;
    }
    if (updateData.address !== undefined) {
      dataToUpdate.address = updateData.address;
    }
    if (updateData.pincode !== undefined) {
      dataToUpdate.pincode = updateData.pincode;
    }
    if (updateData.relationType !== undefined) {
      dataToUpdate.relationType = updateData.relationType;
    }
    if (updateData.relationName !== undefined) {
      dataToUpdate.relationName = updateData.relationName;
    }
    if (updateData.isVoted2024 !== undefined) {
      dataToUpdate.isVoted2024 = updateData.isVoted2024;
    }

    const [updatedVoter] = await db
      .update(Voters)
      .set(dataToUpdate)
      .where(eq(Voters.epicNumber, epicNumber))
      .returning();

    return updatedVoter || null;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update voter',
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
        wardNo: voterData.wardNo || null,
        partNo: voterData.partNo || null,
        srNo: voterData.srNo || null,
        houseNumber: voterData.houseNumber || null,
        religion: voterData.religion || null,
        age: voterData.age || null,
        gender: voterData.gender || null,
        mobileNoPrimary: voterData.mobileNoPrimary || null,
        mobileNoSecondary: voterData.mobileNoSecondary || null,
        boothName: voterData.boothName || null,
        englishBoothAddress: voterData.englishBoothAddress || null,
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
  notes,
}: {
  serviceType: 'individual' | 'community';
  serviceName: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  requestedBy: string;
  assignedTo?: string;
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
}: {
  serviceId: string;
  voterId: string;
  taskType: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  notes?: string;
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

export async function getTasksWithFilters({
  status,
  priority,
  token,
  mobileNo,
  voterId,
  page = 1,
  limit = 10,
  assignedTo,
}: {
  status?: string;
  priority?: string;
  token?: string;
  mobileNo?: string;
  voterId?: string;
  page?: number;
  limit?: number;
  assignedTo?: string;
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

    // Build where conditions
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

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: count() })
      .from(voterTasks)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const totalCount = totalCountResult[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Build final where conditions including join filters
    const finalWhereConditions = [...whereConditions];

    if (token) {
      finalWhereConditions.push(eq(beneficiaryServices.token, token));
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

    // Get tasks with joins
    const query = db
      .select({
        // VoterTask fields
        id: voterTasks.id,
        serviceId: voterTasks.serviceId,
        voterId: voterTasks.voterId,
        taskType: voterTasks.taskType,
        description: voterTasks.description,
        status: voterTasks.status,
        priority: voterTasks.priority,
        assignedTo: voterTasks.assignedTo,
        createdAt: voterTasks.createdAt,
        updatedAt: voterTasks.updatedAt,
        completedAt: voterTasks.completedAt,
        notes: voterTasks.notes,
        // Service fields
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
        // Voter fields
        voterName: Voters.fullName,
        voterMobilePrimary: Voters.mobileNoPrimary,
        voterMobileSecondary: Voters.mobileNoSecondary,
        voterAge: Voters.age,
        voterGender: Voters.gender,
        voterRelation: Voters.relationName,
        voterPartNo: Voters.partNo,
        voterWardNo: Voters.wardNo,
        voterAcNo: Voters.acNo,
        voterBoothName: Voters.boothName,
      })
      .from(voterTasks)
      .leftJoin(beneficiaryServices, eq(voterTasks.serviceId, beneficiaryServices.id))
      .leftJoin(Voters, eq(voterTasks.voterId, Voters.epicNumber))
      .where(finalWhereConditions.length > 0 ? and(...finalWhereConditions) : sql`1=1`)
      .orderBy(desc(voterTasks.createdAt))
      .limit(limit)
      .offset(offset);

    const results = await query;

    // Transform results to include nested objects
    const tasks = results.map(row => ({
      id: row.id,
      serviceId: row.serviceId,
      voterId: row.voterId,
      taskType: row.taskType,
      description: row.description,
      status: row.status,
      priority: row.priority,
      assignedTo: row.assignedTo,
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
}: {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
  assignedTo?: string;
  performedBy?: string;
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
    // Get user record
    const [userRecord] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!userRecord) {
      return false;
    }

    const moduleKeysToCheck =
      moduleKey === 'daily-programme' || moduleKey === 'calendar'
        ? ['daily-programme', 'calendar']
        : [moduleKey];

    console.log(moduleKeysToCheck, userRecord.roleId)

    // First check role-based permissions if user has a roleId
    if (userRecord.roleId) {
      const moduleKeyCondition =
        moduleKeysToCheck.length === 1
          ? eq(roleModulePermissions.moduleKey, moduleKeysToCheck[0]!)
          : inArray(roleModulePermissions.moduleKey, moduleKeysToCheck);

      const [rolePermission] = await db
        .select()
        .from(roleModulePermissions)
        .where(
          and(
            eq(roleModulePermissions.roleId, userRecord.roleId),
            eq(roleModulePermissions.hasAccess, true),
            moduleKeyCondition,
          ),
        )
        .limit(1);
      console.log('rolePermission', rolePermission.hasAccess)
      if (rolePermission.hasAccess) {
        return true;
      }
    }

    // Then check user-specific permissions (for overrides)
    const moduleKeyCondition =
      moduleKeysToCheck.length === 1
        ? eq(userModulePermissions.moduleKey, moduleKeysToCheck[0]!)
        : inArray(userModulePermissions.moduleKey, moduleKeysToCheck);

    const [permission] = await db
      .select()
      .from(userModulePermissions)
      .where(
        and(
          eq(userModulePermissions.userId, userId),
          eq(userModulePermissions.hasAccess, true),
          moduleKeyCondition,
        ),
      )
      .limit(1);

    return permission !== undefined;
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
} = {}): Promise<Array<DailyProgramme>> {
  try {
    const conditions: SQL[] = [];
    if (startDate) {
      conditions.push(gte(dailyProgramme.date, formatDateToString(startDate)));
    }
    if (endDate) {
      conditions.push(lte(dailyProgramme.date, formatDateToString(endDate)));
    }

    return await db
      .select()
      .from(dailyProgramme)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(dailyProgramme.date), asc(dailyProgramme.startTime))
      .limit(limit);
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
): Promise<DailyProgramme | null> {
  try {
    const [updated] = await db
      .update(dailyProgramme)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(dailyProgramme.id, id))
      .returning();

    return updated || null;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update daily programme item',
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

// Register Entry Queries
export async function createRegisterEntry({
  type,
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
  limit = 100,
}: {
  type?: 'inward' | 'outward';
  startDate?: Date | string;
  endDate?: Date | string;
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

    // Get entries with their attachments using a left join
    const results = await db
      .select({
        entry: registerEntry,
        attachment: registerAttachment,
      })
      .from(registerEntry)
      .leftJoin(registerAttachment, eq(registerEntry.id, registerAttachment.entryId))
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
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update register entry',
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
): Promise<Role> {
  try {
    const [newRole] = await db
      .insert(role)
      .values({
        name,
        description,
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
): Promise<Role> {
  try {
    const [updatedRole] = await db
      .update(role)
      .set({
        name,
        description,
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
  purpose,
  programmeEventId,
  visitDate,
  createdBy,
}: {
  name: string;
  contactNumber: string;
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
  purpose,
  programmeEventId,
  visitDate,
}: {
  id: string;
  name?: string;
  contactNumber?: string;
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

// Get voters with optional filters for export
export async function getVotersForExport(filters?: {
  partNo?: string;
  wardNo?: string;
  acNo?: string;
  gender?: string;
  minAge?: number;
  maxAge?: number;
  hasPhone?: boolean;
}): Promise<Voter[]> {
  try {
    const conditions: SQL<unknown>[] = [];

    if (filters?.partNo) {
      conditions.push(eq(Voters.partNo, filters.partNo));
    }
    if (filters?.wardNo) {
      conditions.push(eq(Voters.wardNo, filters.wardNo));
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
  partNo?: string;
  wardNo?: string;
  acNo?: string;
  gender?: string;
  minAge?: number;
  maxAge?: number;
  hasPhone?: boolean;
}): Promise<number> {
  try {
    const conditions: SQL<unknown>[] = [];

    if (filters?.partNo) {
      conditions.push(eq(Voters.partNo, filters.partNo));
    }
    if (filters?.wardNo) {
      conditions.push(eq(Voters.wardNo, filters.wardNo));
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

    let result;
    if (conditions.length > 0) {
      result = await db
        .select({ count: count() })
        .from(Voters)
        .where(and(...conditions));
    } else {
      result = await db.select({ count: count() }).from(Voters);
    }

    return result[0]?.count || 0;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to count voters for export');
  }
}