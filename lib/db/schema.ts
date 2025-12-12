import type { InferSelectModel } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  date,
  json,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
  integer,
  unique,
} from 'drizzle-orm/pg-core';

// Role Table (defined before User to allow forward reference)
export const role = pgTable('Role', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  defaultLandingModule: varchar('default_landing_module', { length: 50 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Role = InferSelectModel<typeof role>;

export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: varchar('user_id', { length: 64 }).notNull().unique(),
  password: varchar('password', { length: 64 }),
  roleId: uuid('role_id').references(() => role.id, { onDelete: 'restrict' }),
  metadata: json('metadata'), // Stores user preferences like language, theme, etc.
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type User = InferSelectModel<typeof user>;

// Role Module Permissions Table
export const roleModulePermissions = pgTable(
  'RoleModulePermissions',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    roleId: uuid('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'cascade' }),
    moduleKey: varchar('module_key', { length: 50 }).notNull(),
    hasAccess: boolean('has_access').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqueRoleModule: unique().on(table.roleId, table.moduleKey),
  }),
);

export type RoleModulePermission = InferSelectModel<typeof roleModulePermissions>;

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

export const PartNo = pgTable('PartNo', {
  partNo: varchar('part_no', { length: 10 }).primaryKey().notNull(),
  wardNo: varchar('ward_no', { length: 10 }),
  boothName: varchar('booth_name', { length: 255 }),
  englishBoothAddress: text('english_booth_address'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type PartNoType = InferSelectModel<typeof PartNo>;

export const Voters = pgTable('Voter', {
  epicNumber: varchar('epic_number', { length: 20 }).primaryKey().notNull(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  relationType: varchar('relation_type', { length: 50 }),
  relationName: varchar('relation_name', { length: 255 }),
  familyGrouping: varchar('family_grouping', { length: 100 }),
  acNo: varchar('ac_no', { length: 10 }),
  partNo: varchar('part_no', { length: 10 }).references(() => PartNo.partNo),
  srNo: varchar('sr_no', { length: 10 }),
  houseNumber: varchar('house_number', { length: 127 }),
  religion: varchar('religion', { length: 50 }),
  age: integer('age'),
  gender: varchar('gender', { length: 10 }),
  isVoted2024: boolean('is_voted_2024').default(false),
  mobileNoPrimary: varchar('mobile_no_primary', { length: 15 }),
  mobileNoSecondary: varchar('mobile_no_secondary', { length: 15 }),
  address: text('address'),
  pincode: varchar('pincode', { length: 10 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Voter = InferSelectModel<typeof Voters>;

// Extended Voter type that includes PartNo information
export type VoterWithPartNo = Voter & {
  wardNo?: string | null;
  boothName?: string | null;
  englishBoothAddress?: string | null;
};

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
  createdBy: uuid('created_by').references(() => user.id),
  updatedBy: uuid('updated_by').references(() => user.id),
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

// Module Permissions Table
export const userModulePermissions = pgTable('UserModulePermissions', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  moduleKey: varchar('module_key', { length: 50 }).notNull(),
  hasAccess: boolean('has_access').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type UserModulePermission = InferSelectModel<typeof userModulePermissions>;

// Daily Programme Table
export const dailyProgramme = pgTable('DailyProgramme', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  date: date('date', { mode: 'string' }).notNull(),
  startTime: varchar('start_time', { length: 10 }).notNull(), // HH:MM format
  endTime: varchar('end_time', { length: 10 }), // HH:MM format, nullable
  title: varchar('title', { length: 255 }).notNull(),
  location: varchar('location', { length: 255 }).notNull(),
  remarks: text('remarks'),
  attended: boolean('attended'), // null = not set, true = attended, false = not attended
  createdBy: uuid('created_by')
    .notNull()
    .references(() => user.id),
  updatedBy: uuid('updated_by').references(() => user.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type DailyProgramme = InferSelectModel<typeof dailyProgramme>;

// MLA Projects Table
export const mlaProject = pgTable('MlaProject', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  ward: varchar('ward', { length: 100 }),
  type: varchar('type', { length: 100 }),
  status: varchar('status', {
    enum: ['Concept', 'Proposal', 'In Progress', 'Completed'],
  })
    .notNull()
    .default('Concept'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type MlaProject = InferSelectModel<typeof mlaProject>;

// Project Attachments Table
export const projectAttachment = pgTable('ProjectAttachment', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => mlaProject.id, { onDelete: 'cascade' }),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileSizeKb: integer('file_size_kb').notNull(),
  fileUrl: text('file_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type ProjectAttachment = InferSelectModel<typeof projectAttachment>;

// Register Entry Table (for Inward/Outward)
export const registerEntry = pgTable('RegisterEntry', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  type: varchar('type', { enum: ['inward', 'outward'] }).notNull(),
  documentType: varchar('document_type', { enum: ['VIP', 'Department', 'General'] }).notNull().default('General'),
  date: date('date', { mode: 'string' }).notNull(),
  fromTo: varchar('from_to', { length: 255 }).notNull(), // "From" for inward, "To" for outward
  subject: varchar('subject', { length: 500 }).notNull(),
  projectId: uuid('project_id').references(() => mlaProject.id),
  mode: varchar('mode', { length: 100 }), // Hand, Email, Dak, Courier, etc.
  refNo: varchar('ref_no', { length: 100 }),
  officer: varchar('officer', { length: 255 }),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type RegisterEntry = InferSelectModel<typeof registerEntry>;

// Register Attachments Table
export const registerAttachment = pgTable('RegisterAttachment', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  entryId: uuid('entry_id')
    .notNull()
    .references(() => registerEntry.id, { onDelete: 'cascade' }),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileSizeKb: integer('file_size_kb').notNull(),
  fileUrl: text('file_url'), // for future cloud storage integration
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type RegisterAttachment = InferSelectModel<typeof registerAttachment>;

// Visitor Table (for programme event visitor management)
export const visitor = pgTable('Visitor', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  contactNumber: varchar('contact_number', { length: 20 }).notNull(),
  aadharNumber: varchar('aadhar_number', { length: 12 }).notNull(),
  purpose: text('purpose').notNull(),
  programmeEventId: uuid('programme_event_id').references(() => dailyProgramme.id, { onDelete: 'set null' }),
  visitDate: timestamp('visit_date').notNull(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Visitor = InferSelectModel<typeof visitor>;

// Export Jobs Table (for tracking long-running export tasks)
export const exportJob = pgTable('ExportJob', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  type: varchar('type', { length: 50 }).notNull(), // 'voters', 'visitors', 'register', etc.
  format: varchar('format', { length: 10 }).notNull(), // 'pdf', 'excel', 'csv'
  status: varchar('status', {
    enum: ['pending', 'processing', 'completed', 'failed']
  }).notNull().default('pending'),
  progress: integer('progress').notNull().default(0), // 0-100
  totalRecords: integer('total_records').default(0),
  processedRecords: integer('processed_records').default(0),
  fileUrl: text('file_url'),
  fileName: varchar('file_name', { length: 255 }),
  fileSizeKb: integer('file_size_kb'),
  filters: json('filters'), // Store filter parameters used for the export
  errorMessage: text('error_message'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
});

export type ExportJob = InferSelectModel<typeof exportJob>;

// Phone Update History Table
export const phoneUpdateHistory = pgTable('PhoneUpdateHistory', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  epicNumber: varchar('epic_number', { length: 20 })
    .notNull()
    .references(() => Voters.epicNumber, { onDelete: 'cascade' }),
  oldMobileNoPrimary: varchar('old_mobile_no_primary', { length: 15 }),
  newMobileNoPrimary: varchar('new_mobile_no_primary', { length: 15 }),
  oldMobileNoSecondary: varchar('old_mobile_no_secondary', { length: 15 }),
  newMobileNoSecondary: varchar('new_mobile_no_secondary', { length: 15 }),
  updatedBy: uuid('updated_by')
    .notNull()
    .references(() => user.id),
  sourceModule: varchar('source_module', { length: 50 }).notNull(), // 'profile_update' or 'beneficiary_management'
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type PhoneUpdateHistory = InferSelectModel<typeof phoneUpdateHistory>;

