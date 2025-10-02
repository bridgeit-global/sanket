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
  voters,
  type Voter,
  services,
  beneficiaries,
} from './schema';
import type { ArtifactKind } from '@/components/artifact';
import { generateUUID } from '../utils';
import { generateHashedPassword } from './utils';
import type { VisibilityType } from '@/components/visibility-selector';
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

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await db.insert(user).values({ email, password: hashedPassword });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create user');
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

// Voter-related functions
export async function getVoterById({ id }: { id: string }) {
  try {
    const [voter] = await db
      .select()
      .from(voters)
      .where(eq(voters.id, id))
      .execute();

    return voter;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voter by id',
    );
  }
}

export async function getVotersByPartNo({ part_no }: { part_no: number }) {
  try {
    return await db
      .select()
      .from(voters)
      .where(eq(voters.part_no, part_no))
      .orderBy(asc(voters.serial_no))
      .execute();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voters by part no',
    );
  }
}

export async function searchVotersByName({ name }: { name: string }) {
  try {
    return await db
      .select()
      .from(voters)
      .where(sql`LOWER(${voters.name}) LIKE LOWER(${`%${name}%`})`)
      .orderBy(asc(voters.name))
      .execute();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to search voters by name',
    );
  }
}

export async function getAllVoters({
  limit = 100,
  offset = 0,
}: {
  limit?: number;
  offset?: number;
} = {}) {
  try {
    return await db
      .select()
      .from(voters)
      .where(eq(voters.isActive, true))
      .orderBy(asc(voters.part_no), asc(voters.serial_no))
      .limit(limit)
      .offset(offset)
      .execute();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get all voters',
    );
  }
}

export async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    const result = await db.select({ count: count(voters.id) }).from(voters).execute();
    console.log('Database connection test result:', result);
    return result[0];
  } catch (error) {
    console.error('Database connection test failed:', error);
    throw error;
  }
}

export async function getVotersCount() {
  try {
    const [result] = await db
      .select({ count: count(voters.id) })
      .from(voters)
      .where(eq(voters.isActive, true))
      .execute();

    return result?.count ?? 0;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voters count',
    );
  }
}

// Insight functions for voter analysis
export async function getVoterDemographics() {
  try {
    console.log('getVoterDemographics called');
    const demographics = await db
      .select({
        totalVoters: count(voters.id),
        maleCount: count(sql`CASE WHEN ${voters.gender} = 'M' THEN 1 END`),
        femaleCount: count(sql`CASE WHEN ${voters.gender} = 'F' THEN 1 END`),
        otherCount: count(sql`CASE WHEN ${voters.gender} = 'O' THEN 1 END`),
        avgAge: sql`AVG(${voters.age})`,
        minAge: sql`MIN(${voters.age})`,
        maxAge: sql`MAX(${voters.age})`,
      })
      .from(voters)
      .where(eq(voters.isActive, true))
      .execute();
    console.log('demographics', demographics);
    return demographics[0];
  } catch (error) {
    console.error('Error in getVoterDemographics:', error);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voter demographics',
    );
  }
}

export async function getVotersByAgeGroup() {
  try {
    console.log('getVotersByAgeGroup called');
    const result = await db
      .select({
        ageGroup: sql`CASE 
          WHEN ${voters.age} < 25 THEN '18-24'
          WHEN ${voters.age} < 35 THEN '25-34'
          WHEN ${voters.age} < 45 THEN '35-44'
          WHEN ${voters.age} < 55 THEN '45-54'
          WHEN ${voters.age} < 65 THEN '55-64'
          ELSE '65+'
        END`.as('ageGroup'),
        count: count(voters.id),
      })
      .from(voters)
      .where(eq(voters.isActive, true))
      .groupBy(sql`CASE 
          WHEN ${voters.age} < 25 THEN '18-24'
          WHEN ${voters.age} < 35 THEN '25-34'
          WHEN ${voters.age} < 45 THEN '35-44'
          WHEN ${voters.age} < 55 THEN '45-54'
          WHEN ${voters.age} < 65 THEN '55-64'
          ELSE '65+'
        END`)
      .execute();

    // Sort the results in JavaScript to ensure correct order
    const ageGroupOrder = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
    const sortedResult = result.sort((a, b) => {
      const aIndex = ageGroupOrder.indexOf(a.ageGroup as string);
      const bIndex = ageGroupOrder.indexOf(b.ageGroup as string);
      return aIndex - bIndex;
    });

    console.log('getVotersByAgeGroup result:', sortedResult);
    return sortedResult;
  } catch (error) {
    console.error('Error in getVotersByAgeGroup:', error);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voters by age group',
    );
  }
}

export async function getVotersByAgeGroupWithGender() {
  try {
    console.log('getVotersByAgeGroupWithGender called');
    const result = await db
      .select({
        ageGroup: sql`CASE 
          WHEN ${voters.age} < 25 THEN '18-24'
          WHEN ${voters.age} < 35 THEN '25-34'
          WHEN ${voters.age} < 45 THEN '35-44'
          WHEN ${voters.age} < 55 THEN '45-54'
          WHEN ${voters.age} < 65 THEN '55-64'
          ELSE '65+'
        END`.as('ageGroup'),
        maleCount: count(sql`CASE WHEN ${voters.gender} = 'M' THEN 1 END`),
        femaleCount: count(sql`CASE WHEN ${voters.gender} = 'F' THEN 1 END`),
        totalCount: count(voters.id),
      })
      .from(voters)
      .where(eq(voters.isActive, true))
      .groupBy(sql`CASE 
          WHEN ${voters.age} < 25 THEN '18-24'
          WHEN ${voters.age} < 35 THEN '25-34'
          WHEN ${voters.age} < 45 THEN '35-44'
          WHEN ${voters.age} < 55 THEN '45-54'
          WHEN ${voters.age} < 65 THEN '55-64'
          ELSE '65+'
        END`)
      .execute();

    // Sort the results in JavaScript to ensure correct order
    const ageGroupOrder = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
    const sortedResult = result.sort((a, b) => {
      const aIndex = ageGroupOrder.indexOf(a.ageGroup as string);
      const bIndex = ageGroupOrder.indexOf(b.ageGroup as string);
      return aIndex - bIndex;
    });

    // Calculate totals
    const totalMale = sortedResult.reduce((sum, group) => sum + group.maleCount, 0);
    const totalFemale = sortedResult.reduce((sum, group) => sum + group.femaleCount, 0);
    const totalVoters = totalMale + totalFemale;

    console.log('getVotersByAgeGroupWithGender result:', sortedResult);
    return {
      ageGroups: sortedResult,
      totalVoters,
      totalMale,
      totalFemale,
    };
  } catch (error) {
    console.error('Error in getVotersByAgeGroupWithGender:', error);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voters by age group with gender',
    );
  }
}

export async function getVotersByPart() {
  try {
    return await db
      .select({
        part_no: voters.part_no,
        voterCount: count(voters.id),
        maleCount: count(sql`CASE WHEN ${voters.gender} = 'M' THEN 1 END`),
        femaleCount: count(sql`CASE WHEN ${voters.gender} = 'F' THEN 1 END`),
        avgAge: sql`AVG(${voters.age})`,
      })
      .from(voters)
      .where(eq(voters.isActive, true))
      .groupBy(voters.part_no)
      .orderBy(asc(voters.part_no))
      .execute();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voters by part',
    );
  }
}

export async function getVotersWithContactInfo() {
  try {
    return await db
      .select({
        id: voters.id,
        name: voters.name,
        part_no: voters.part_no,
        serial_no: voters.serial_no,
        age: voters.age,
        gender: voters.gender,
        family: voters.family,
        last_name: voters.last_name,
        mobile: voters.mobile,
        email: voters.email,
      })
      .from(voters)
      .where(eq(voters.isActive, true))
      .orderBy(asc(voters.part_no), asc(voters.serial_no))
      .execute();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voters with contact info',
    );
  }
}

export async function getVoterSearchInsights({ searchTerm }: { searchTerm: string }) {
  try {
    const searchResults = await db
      .select({
        id: voters.id,
        name: voters.name,
        part_no: voters.part_no,
        serial_no: voters.serial_no,
        age: voters.age,
        gender: voters.gender,
        family: voters.family,
        last_name: voters.last_name,
        mobile: voters.mobile,
        email: voters.email,
      })
      .from(voters)
      .where(
        and(
          eq(voters.isActive, true),
          sql`LOWER(${voters.last_name}) LIKE LOWER(${`%${searchTerm}%`})`
        )
      )
      .orderBy(asc(voters.part_no), asc(voters.serial_no))
      .execute();

    const totalResults = searchResults.length;
    const genderBreakdown = searchResults.reduce((acc, voter) => {
      const gender = voter.gender === 'M' ? 'Male' :
        voter.gender === 'F' ? 'Female' :
          voter.gender === 'O' ? 'Other' :
            voter.gender; // fallback
      acc[gender] = (acc[gender] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const ageGroups = searchResults.reduce((acc, voter) => {
      const ageGroup = voter.age < 25 ? '18-24' :
        voter.age < 35 ? '25-34' :
          voter.age < 45 ? '35-44' :
            voter.age < 55 ? '45-54' :
              voter.age < 65 ? '55-64' : '65+';
      acc[ageGroup] = (acc[ageGroup] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate age groups with gender bifurcation
    const ageGroupsWithGender = searchResults.reduce((acc, voter) => {
      const ageGroup = voter.age < 25 ? '18-24' :
        voter.age < 35 ? '25-34' :
          voter.age < 45 ? '35-44' :
            voter.age < 55 ? '45-54' :
              voter.age < 65 ? '55-64' : '65+';

      if (!acc[ageGroup]) {
        acc[ageGroup] = { maleCount: 0, femaleCount: 0, totalCount: 0 };
      }

      if (voter.gender === 'M') {
        acc[ageGroup].maleCount++;
      } else if (voter.gender === 'F') {
        acc[ageGroup].femaleCount++;
      }
      acc[ageGroup].totalCount++;

      return acc;
    }, {} as Record<string, { maleCount: number; femaleCount: number; totalCount: number }>);

    return {
      totalResults,
      searchResults,
      genderBreakdown,
      ageGroups,
      ageGroupsWithGender,
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voter search insights',
    );
  }
}

// Beneficiary Management Queries
export async function getAllServices() {
  try {
    return await db
      .select()
      .from(services)
      .where(eq(services.isActive, true))
      .orderBy(asc(services.name))
      .execute();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get all services',
    );
  }
}

export async function getServiceById({ id }: { id: string }) {
  try {
    const [service] = await db
      .select()
      .from(services)
      .where(eq(services.id, id))
      .execute();

    return service;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get service by id',
    );
  }
}

export async function createService({
  name,
  description,
  type,
  category,
}: {
  name: string;
  description?: string;
  type: 'one-to-one' | 'one-to-many';
  category: string;
}) {
  try {
    const [service] = await db
      .insert(services)
      .values({
        name,
        description,
        type,
        category,
      })
      .returning();

    return service;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create service',
    );
  }
}

export async function updateService({
  id,
  name,
  description,
  type,
  category,
  isActive,
}: {
  id: string;
  name?: string;
  description?: string;
  type?: 'one-to-one' | 'one-to-many';
  category?: string;
  isActive?: boolean;
}) {
  try {
    const updateData: any = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (category !== undefined) updateData.category = category;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [service] = await db
      .update(services)
      .set(updateData)
      .where(eq(services.id, id))
      .returning();

    return service;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update service',
    );
  }
}

export async function getBeneficiariesByService({ serviceId }: { serviceId: string }) {
  try {
    return await db
      .select({
        id: beneficiaries.id,
        serviceId: beneficiaries.serviceId,
        voterId: beneficiaries.voterId,
        partNo: beneficiaries.partNo,
        status: beneficiaries.status,
        notes: beneficiaries.notes,
        applicationDate: beneficiaries.applicationDate,
        completionDate: beneficiaries.completionDate,
        service: {
          id: services.id,
          name: services.name,
          type: services.type,
          category: services.category,
        },
        voter: {
          id: voters.id,
          name: voters.name,
          part_no: voters.part_no,
          serial_no: voters.serial_no,
        },
      })
      .from(beneficiaries)
      .leftJoin(services, eq(beneficiaries.serviceId, services.id))
      .leftJoin(voters, eq(beneficiaries.voterId, voters.id))
      .where(
        and(
          eq(beneficiaries.serviceId, serviceId),
          eq(beneficiaries.isActive, true)
        )
      )
      .orderBy(desc(beneficiaries.applicationDate))
      .execute();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get beneficiaries by service',
    );
  }
}

export async function getBeneficiariesByVoter({ voterId }: { voterId: string }) {
  try {
    return await db
      .select({
        id: beneficiaries.id,
        serviceId: beneficiaries.serviceId,
        voterId: beneficiaries.voterId,
        partNo: beneficiaries.partNo,
        status: beneficiaries.status,
        notes: beneficiaries.notes,
        applicationDate: beneficiaries.applicationDate,
        completionDate: beneficiaries.completionDate,
        service: {
          id: services.id,
          name: services.name,
          type: services.type,
          category: services.category,
        },
      })
      .from(beneficiaries)
      .leftJoin(services, eq(beneficiaries.serviceId, services.id))
      .where(
        and(
          eq(beneficiaries.voterId, voterId),
          eq(beneficiaries.isActive, true)
        )
      )
      .orderBy(desc(beneficiaries.applicationDate))
      .execute();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get beneficiaries by voter',
    );
  }
}

export async function getBeneficiariesByPart({ partNo }: { partNo: number }) {
  try {
    return await db
      .select({
        id: beneficiaries.id,
        serviceId: beneficiaries.serviceId,
        voterId: beneficiaries.voterId,
        partNo: beneficiaries.partNo,
        status: beneficiaries.status,
        notes: beneficiaries.notes,
        applicationDate: beneficiaries.applicationDate,
        completionDate: beneficiaries.completionDate,
        service: {
          id: services.id,
          name: services.name,
          type: services.type,
          category: services.category,
        },
      })
      .from(beneficiaries)
      .leftJoin(services, eq(beneficiaries.serviceId, services.id))
      .where(
        and(
          eq(beneficiaries.partNo, partNo),
          eq(beneficiaries.isActive, true)
        )
      )
      .orderBy(desc(beneficiaries.applicationDate))
      .execute();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get beneficiaries by part',
    );
  }
}

export async function createBeneficiary({
  serviceId,
  voterId,
  partNo,
  notes,
}: {
  serviceId: string;
  voterId?: string;
  partNo?: number;
  notes?: string;
}) {
  try {
    // Validate that either voterId or partNo is provided
    if (!voterId && !partNo) {
      throw new Error('Either voterId or partNo must be provided');
    }

    const [beneficiary] = await db
      .insert(beneficiaries)
      .values({
        serviceId,
        voterId,
        partNo,
        notes,
      })
      .returning();

    return beneficiary;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create beneficiary',
    );
  }
}

export async function updateBeneficiary({
  id,
  status,
  notes,
  completionDate,
}: {
  id: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'rejected';
  notes?: string;
  completionDate?: Date;
}) {
  try {
    const updateData: any = { updatedAt: new Date() };
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (completionDate !== undefined) updateData.completionDate = completionDate;

    const [beneficiary] = await db
      .update(beneficiaries)
      .set(updateData)
      .where(eq(beneficiaries.id, id))
      .returning();

    return beneficiary;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update beneficiary',
    );
  }
}

export async function getBeneficiaryStats() {
  try {
    const stats = await db
      .select({
        totalBeneficiaries: count(beneficiaries.id),
        pendingCount: count(sql`CASE WHEN ${beneficiaries.status} = 'pending' THEN 1 END`),
        inProgressCount: count(sql`CASE WHEN ${beneficiaries.status} = 'in_progress' THEN 1 END`),
        completedCount: count(sql`CASE WHEN ${beneficiaries.status} = 'completed' THEN 1 END`),
        rejectedCount: count(sql`CASE WHEN ${beneficiaries.status} = 'rejected' THEN 1 END`),
        oneToOneCount: count(sql`CASE WHEN ${beneficiaries.voterId} IS NOT NULL THEN 1 END`),
        oneToManyCount: count(sql`CASE WHEN ${beneficiaries.partNo} IS NOT NULL THEN 1 END`),
      })
      .from(beneficiaries)
      .where(eq(beneficiaries.isActive, true))
      .execute();

    return stats[0];
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get beneficiary stats',
    );
  }
}