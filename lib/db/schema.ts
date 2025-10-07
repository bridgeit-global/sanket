import type { InferSelectModel } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  json,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';

export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }),
  role: varchar('role', { enum: ['admin', 'operator', 'back-office', 'regular'] }).notNull().default('regular'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable('Chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull(),
  title: text('title').notNull(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  visibility: varchar('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const messageDeprecated = pgTable('Message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  content: json('content').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable('Message_v2', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  parts: json('parts').notNull(),
  attachments: json('attachments').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const voteDeprecated = pgTable(
  'Vote',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
  'Vote_v2',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  'Document',
  {
    id: uuid('id').notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    kind: varchar('text', { enum: ['text', 'code', 'image', 'sheet'] })
      .notNull()
      .default('text'),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  },
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  'Suggestion',
  {
    id: uuid('id').notNull().defaultRandom(),
    documentId: uuid('documentId').notNull(),
    documentCreatedAt: timestamp('documentCreatedAt').notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: boolean('isResolved').notNull().default(false),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  }),
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  'Stream',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    chatId: uuid('chatId').notNull(),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  }),
);

export type Stream = InferSelectModel<typeof stream>;

export const Voters = pgTable('Voter', {
  epicNumber: varchar('epic_number', { length: 20 }).primaryKey().notNull(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  relationType: varchar('relation_type', { length: 50 }),
  relationName: varchar('relation_name', { length: 255 }),
  familyGrouping: varchar('family_grouping', { length: 100 }),
  acNo: varchar('ac_no', { length: 10 }),
  wardNo: varchar('ward_no', { length: 10 }),
  partNo: varchar('part_no', { length: 10 }),
  srNo: varchar('sr_no', { length: 10 }),
  houseNumber: varchar('house_number', { length: 127 }),
  religion: varchar('religion', { length: 50 }),
  age: integer('age'),
  gender: varchar('gender', { length: 10 }),
  isVoted2024: boolean('is_voted_2024').default(false),
  mobileNoPrimary: varchar('mobile_no_primary', { length: 15 }),
  mobileNoSecondary: varchar('mobile_no_secondary', { length: 15 }),
  boothName: varchar('booth_name', { length: 255 }),
  englishBoothAddress: text('english_booth_address'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Voter = InferSelectModel<typeof Voters>;

export const beneficiaryServices = pgTable('BeneficiaryService', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  serviceType: varchar('service_type', { enum: ['individual', 'community'] }).notNull(),
  serviceName: varchar('service_name', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { enum: ['pending', 'in_progress', 'completed', 'cancelled'] }).notNull().default('pending'),
  priority: varchar('priority', { enum: ['low', 'medium', 'high', 'urgent'] }).notNull().default('medium'),
  requestedBy: uuid('requested_by').notNull().references(() => user.id),
  assignedTo: uuid('assigned_to').references(() => user.id),
  token: varchar('token', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  notes: text('notes'),
});

export type BeneficiaryService = InferSelectModel<typeof beneficiaryServices>;

export const voterTasks = pgTable('VoterTask', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  serviceId: uuid('service_id').notNull().references(() => beneficiaryServices.id),
  voterId: varchar('voter_id', { length: 20 }).notNull().references(() => Voters.epicNumber),
  taskType: varchar('task_type', { length: 100 }).notNull(),
  description: text('description'),
  status: varchar('status', { enum: ['pending', 'in_progress', 'completed', 'cancelled'] }).notNull().default('pending'),
  priority: varchar('priority', { enum: ['low', 'medium', 'high', 'urgent'] }).notNull().default('medium'),
  assignedTo: uuid('assigned_to').references(() => user.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  notes: text('notes'),
});

export type VoterTask = InferSelectModel<typeof voterTasks>;

export const communityServiceAreas = pgTable('CommunityServiceArea', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  serviceId: uuid('service_id').notNull().references(() => beneficiaryServices.id),
  partNo: varchar('part_no', { length: 10 }),
  wardNo: varchar('ward_no', { length: 10 }),
  acNo: varchar('ac_no', { length: 10 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type CommunityServiceArea = InferSelectModel<typeof communityServiceAreas>;

export const taskHistory = pgTable('TaskHistory', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  taskId: uuid('task_id').notNull().references(() => voterTasks.id),
  action: varchar('action', { length: 50 }).notNull(), // 'created', 'status_changed', 'priority_changed', 'note_added', 'escalated', 'assigned'
  oldValue: text('old_value'),
  newValue: text('new_value'),
  performedBy: uuid('performed_by').notNull().references(() => user.id),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type TaskHistory = InferSelectModel<typeof taskHistory>;

