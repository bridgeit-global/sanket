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
const db = drizzle(client);

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get user by email',
    );
  }
}

export async function createUser(email: string, password: string, role: User['role'] = 'regular') {
  const hashedPassword = generateHashedPassword(password);

  try {
    console.log('Creating user with:', { email, role });
    const result = await db.insert(user).values({ email, password: hashedPassword, role });
    console.log('User created successfully:', result);
    return result;
  } catch (error) {
    console.error('Create user error:', error);
    throw new ChatSDKError('bad_request:database', 'Failed to create user');
  }
}

export async function updateUserRole(userId: string, role: User['role']) {
  try {
    return await db.update(user).set({ role, updatedAt: new Date() }).where(eq(user.id, userId));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update user role');
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
    return await db.select().from(user).orderBy(asc(user.email));
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