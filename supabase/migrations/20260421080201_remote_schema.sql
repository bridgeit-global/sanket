drop extension if exists "pg_net";

create schema if not exists "drizzle";

create schema if not exists "neon_auth";

create sequence "drizzle"."__drizzle_migrations_id_seq";


  create table "drizzle"."__drizzle_migrations" (
    "id" integer not null default nextval('drizzle.__drizzle_migrations_id_seq'::regclass),
    "hash" text not null,
    "created_at" bigint
      );



  create table "neon_auth"."users_sync" (
    "raw_json" jsonb not null,
    "id" text not null generated always as ((raw_json ->> 'id'::text)) stored,
    "name" text generated always as ((raw_json ->> 'display_name'::text)) stored,
    "email" text generated always as ((raw_json ->> 'primary_email'::text)) stored,
    "created_at" timestamp with time zone generated always as (to_timestamp((trunc((((raw_json ->> 'signed_up_at_millis'::text))::bigint)::double precision) / (1000)::double precision))) stored,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone
      );



  create table "public"."BeneficiaryService" (
    "id" uuid not null default gen_random_uuid(),
    "service_type" character varying not null,
    "service_name" character varying(255) not null,
    "description" text,
    "status" character varying not null default 'pending'::character varying,
    "priority" character varying not null default 'medium'::character varying,
    "requested_by" uuid not null,
    "assigned_to" uuid,
    "created_at" timestamp without time zone not null default now(),
    "updated_at" timestamp without time zone not null default now(),
    "completed_at" timestamp without time zone,
    "notes" text,
    "token" character varying(20) not null,
    "voter_id" character varying(20)
      );



  create table "public"."BoothMaster" (
    "election_id" character varying(50) not null,
    "booth_no" character varying(10) not null,
    "booth_name" character varying(255),
    "booth_address" text,
    "created_at" timestamp without time zone not null default now(),
    "updated_at" timestamp without time zone not null default now()
      );



  create table "public"."Chat" (
    "id" uuid not null default gen_random_uuid(),
    "createdAt" timestamp without time zone not null,
    "userId" uuid not null,
    "title" text not null,
    "visibility" character varying not null default 'private'::character varying
      );



  create table "public"."CommunityServiceArea" (
    "id" uuid not null default gen_random_uuid(),
    "service_id" uuid not null,
    "part_no" character varying(10),
    "ward_no" character varying(10),
    "ac_no" character varying(10),
    "created_at" timestamp without time zone not null default now()
      );



  create table "public"."DailyProgramme" (
    "id" uuid not null default gen_random_uuid(),
    "date" date not null,
    "start_time" character varying(10) not null,
    "end_time" character varying(10),
    "title" character varying(255) not null,
    "location" character varying(255) not null,
    "remarks" text,
    "created_by" uuid not null,
    "created_at" timestamp without time zone not null default now(),
    "updated_at" timestamp without time zone not null default now(),
    "attended" boolean,
    "updated_by" uuid
      );



  create table "public"."DailyProgrammeAttachment" (
    "id" uuid not null default gen_random_uuid(),
    "programme_id" uuid not null,
    "file_name" character varying(255) not null,
    "file_size_kb" integer not null,
    "file_url" text,
    "created_at" timestamp without time zone not null default now()
      );



  create table "public"."Document" (
    "id" uuid not null default gen_random_uuid(),
    "createdAt" timestamp without time zone not null,
    "title" text not null,
    "content" text,
    "userId" uuid not null,
    "text" character varying not null default 'text'::character varying
      );



  create table "public"."ElectionMapping" (
    "epic_number" character varying(20) not null,
    "election_id" character varying(50) not null,
    "booth_no" character varying(10),
    "sr_no" character varying(10),
    "has_voted" boolean default false
      );



  create table "public"."ElectionMaster" (
    "election_id" character varying(50) not null,
    "election_type" character varying(50) not null,
    "year" integer not null,
    "delimitation_version" character varying(50),
    "data_source" character varying(100),
    "created_at" timestamp without time zone not null default now(),
    "updated_at" timestamp without time zone not null default now(),
    "constituency_type" character varying,
    "constituency_id" character varying(50)
      );



  create table "public"."ExportJob" (
    "id" uuid not null default gen_random_uuid(),
    "type" character varying(50) not null,
    "format" character varying(10) not null,
    "status" character varying(20) not null default 'pending'::character varying,
    "progress" integer not null default 0,
    "total_records" integer default 0,
    "processed_records" integer default 0,
    "file_url" text,
    "file_name" character varying(255),
    "file_size_kb" integer,
    "filters" jsonb,
    "error_message" text,
    "created_by" uuid not null,
    "created_at" timestamp without time zone not null default now(),
    "updated_at" timestamp without time zone not null default now(),
    "completed_at" timestamp without time zone
      );



  create table "public"."Message" (
    "id" uuid not null default gen_random_uuid(),
    "chatId" uuid not null,
    "role" character varying not null,
    "content" json not null,
    "createdAt" timestamp without time zone not null
      );



  create table "public"."Message_v2" (
    "id" uuid not null default gen_random_uuid(),
    "chatId" uuid not null,
    "role" character varying not null,
    "parts" json not null,
    "attachments" json not null,
    "createdAt" timestamp without time zone not null
      );



  create table "public"."MlaProject" (
    "id" uuid not null default gen_random_uuid(),
    "name" character varying(255) not null,
    "ward" character varying(100),
    "type" character varying(100),
    "status" character varying not null default 'Concept'::character varying,
    "created_by" uuid not null,
    "created_at" timestamp without time zone not null default now(),
    "updated_at" timestamp without time zone not null default now()
      );



  create table "public"."PartNo" (
    "part_no" character varying(10) not null,
    "ward_no" character varying(10),
    "booth_name" character varying(255),
    "english_booth_address" text,
    "created_at" timestamp without time zone not null default now(),
    "updated_at" timestamp without time zone not null default now()
      );



  create table "public"."PhoneUpdateHistory" (
    "id" uuid not null default gen_random_uuid(),
    "epic_number" character varying(20) not null,
    "old_mobile_no_primary" character varying(15),
    "new_mobile_no_primary" character varying(15),
    "old_mobile_no_secondary" character varying(15),
    "new_mobile_no_secondary" character varying(15),
    "updated_by" uuid not null,
    "source_module" character varying(50) not null,
    "created_at" timestamp without time zone not null default now()
      );



  create table "public"."ProjectAttachment" (
    "id" uuid not null default gen_random_uuid(),
    "project_id" uuid not null,
    "file_name" character varying(255) not null,
    "file_size_kb" integer not null,
    "file_url" text,
    "created_at" timestamp without time zone not null default now()
      );



  create table "public"."RegisterAttachment" (
    "id" uuid not null default gen_random_uuid(),
    "entry_id" uuid not null,
    "file_name" character varying(255) not null,
    "file_size_kb" integer not null,
    "file_url" text,
    "created_at" timestamp without time zone not null default now()
      );



  create table "public"."RegisterEntry" (
    "id" uuid not null default gen_random_uuid(),
    "type" character varying not null,
    "date" date not null,
    "from_to" character varying(255) not null,
    "subject" character varying(500) not null,
    "project_id" uuid,
    "mode" character varying(100),
    "ref_no" character varying(100),
    "officer" character varying(255),
    "created_by" uuid not null,
    "created_at" timestamp without time zone not null default now(),
    "updated_at" timestamp without time zone not null default now(),
    "document_type" character varying not null default 'General'::character varying
      );



  create table "public"."Role" (
    "id" uuid not null default gen_random_uuid(),
    "name" character varying(100) not null,
    "description" text,
    "created_at" timestamp without time zone not null default now(),
    "updated_at" timestamp without time zone not null default now(),
    "default_landing_module" character varying(50)
      );



  create table "public"."RoleModulePermissions" (
    "id" uuid not null default gen_random_uuid(),
    "role_id" uuid not null,
    "module_key" character varying(50) not null,
    "has_access" boolean not null default false,
    "created_at" timestamp without time zone not null default now(),
    "updated_at" timestamp without time zone not null default now()
      );



  create table "public"."Stream" (
    "id" uuid not null default gen_random_uuid(),
    "chatId" uuid not null,
    "createdAt" timestamp without time zone not null
      );



  create table "public"."Suggestion" (
    "id" uuid not null default gen_random_uuid(),
    "documentId" uuid not null,
    "documentCreatedAt" timestamp without time zone not null,
    "originalText" text not null,
    "suggestedText" text not null,
    "description" text,
    "isResolved" boolean not null default false,
    "userId" uuid not null,
    "createdAt" timestamp without time zone not null
      );



  create table "public"."TaskHistory" (
    "id" uuid not null default gen_random_uuid(),
    "task_id" uuid not null,
    "action" character varying(50) not null,
    "old_value" text,
    "new_value" text,
    "performed_by" uuid not null,
    "notes" text,
    "created_at" timestamp without time zone not null default now()
      );



  create table "public"."User" (
    "id" uuid not null default gen_random_uuid(),
    "password" character varying(64),
    "created_at" timestamp without time zone not null default now(),
    "updated_at" timestamp without time zone not null default now(),
    "role_id" uuid,
    "user_id" character varying(64) not null,
    "metadata" json,
    "last_login" timestamp without time zone
      );



  create table "public"."UserModulePermissions" (
    "id" uuid not null default gen_random_uuid(),
    "userId" uuid not null,
    "module_key" character varying(50) not null,
    "has_access" boolean not null default false,
    "created_at" timestamp without time zone not null default now(),
    "updated_at" timestamp without time zone not null default now()
      );



  create table "public"."UserPartAssignment" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "election_id" character varying(50) not null,
    "booth_no" character varying(10) not null,
    "created_at" timestamp without time zone not null default now()
      );



  create table "public"."Visitor" (
    "id" uuid not null default gen_random_uuid(),
    "name" character varying(255) not null,
    "contact_number" character varying(20) not null,
    "purpose" text not null,
    "programme_event_id" uuid,
    "visit_date" timestamp without time zone not null,
    "created_by" uuid not null,
    "created_at" timestamp without time zone not null default now(),
    "updated_at" timestamp without time zone not null default now(),
    "aadhar_number" character varying(12) not null
      );



  create table "public"."Vote" (
    "chatId" uuid not null,
    "messageId" uuid not null,
    "isUpvoted" boolean not null
      );



  create table "public"."Vote_v2" (
    "chatId" uuid not null,
    "messageId" uuid not null,
    "isUpvoted" boolean not null
      );



  create table "public"."VoterMaster" (
    "epic_number" character varying(20) not null,
    "full_name" character varying(255) not null,
    "relation_type" character varying(50),
    "relation_name" character varying(255),
    "family_grouping" character varying(100),
    "house_number" character varying(127),
    "religion" character varying(50),
    "age" integer,
    "dob" date,
    "gender" character varying(10),
    "mobile_no_primary" character varying(15),
    "mobile_no_secondary" character varying(15),
    "address" text,
    "pincode" character varying(10),
    "created_at" timestamp without time zone not null default now(),
    "updated_at" timestamp without time zone not null default now(),
    "caste" character varying(50),
    "locality_street" character varying(255),
    "town_village" character varying(255)
      );



  create table "public"."VoterMobileNumber" (
    "epic_number" character varying(20) not null,
    "mobile_number" character varying(15) not null,
    "sort_order" integer not null,
    "created_at" timestamp without time zone not null default now(),
    "updated_at" timestamp without time zone not null default now()
      );



  create table "public"."VoterProfile" (
    "epic_number" character varying(20) not null,
    "education" character varying(100),
    "occupation_type" character varying,
    "occupation_detail" character varying(255),
    "region" character varying(100),
    "is_our_supporter" boolean,
    "influencer_type" character varying,
    "vehicle_type" character varying,
    "is_profiled" boolean not null default false,
    "profiled_at" timestamp without time zone,
    "profiled_by" uuid,
    "created_at" timestamp without time zone not null default now(),
    "updated_at" timestamp without time zone not null default now(),
    "religion" character varying(50),
    "caste" character varying(50),
    "feedback" text
      );



  create table "public"."VoterTask" (
    "id" uuid not null default gen_random_uuid(),
    "service_id" uuid not null,
    "voter_id" character varying(20) not null,
    "task_type" character varying(100) not null,
    "description" text,
    "status" character varying not null default 'pending'::character varying,
    "priority" character varying not null default 'medium'::character varying,
    "assigned_to" uuid,
    "created_at" timestamp without time zone not null default now(),
    "updated_at" timestamp without time zone not null default now(),
    "completed_at" timestamp without time zone,
    "notes" text,
    "created_by" uuid,
    "updated_by" uuid
      );


alter sequence "drizzle"."__drizzle_migrations_id_seq" owned by "drizzle"."__drizzle_migrations"."id";

CREATE UNIQUE INDEX __drizzle_migrations_pkey ON drizzle.__drizzle_migrations USING btree (id);

CREATE INDEX users_sync_deleted_at_idx ON neon_auth.users_sync USING btree (deleted_at);

CREATE UNIQUE INDEX users_sync_pkey ON neon_auth.users_sync USING btree (id);

CREATE UNIQUE INDEX "BeneficiaryService_pkey" ON public."BeneficiaryService" USING btree (id);

CREATE UNIQUE INDEX "BoothMaster_election_id_booth_no_pk" ON public."BoothMaster" USING btree (election_id, booth_no);

CREATE UNIQUE INDEX "Chat_pkey" ON public."Chat" USING btree (id);

CREATE UNIQUE INDEX "CommunityServiceArea_pkey" ON public."CommunityServiceArea" USING btree (id);

CREATE UNIQUE INDEX "DailyProgrammeAttachment_pkey" ON public."DailyProgrammeAttachment" USING btree (id);

CREATE UNIQUE INDEX "DailyProgramme_pkey" ON public."DailyProgramme" USING btree (id);

CREATE UNIQUE INDEX "Document_id_createdAt_pk" ON public."Document" USING btree (id, "createdAt");

CREATE UNIQUE INDEX "ElectionMapping_epic_number_election_id_pk" ON public."ElectionMapping" USING btree (epic_number, election_id);

CREATE UNIQUE INDEX "ElectionMaster_pkey" ON public."ElectionMaster" USING btree (election_id);

CREATE UNIQUE INDEX "ExportJob_pkey" ON public."ExportJob" USING btree (id);

CREATE UNIQUE INDEX "Message_pkey" ON public."Message" USING btree (id);

CREATE UNIQUE INDEX "Message_v2_pkey" ON public."Message_v2" USING btree (id);

CREATE UNIQUE INDEX "MlaProject_pkey" ON public."MlaProject" USING btree (id);

CREATE UNIQUE INDEX "PartNo_pkey" ON public."PartNo" USING btree (part_no);

CREATE UNIQUE INDEX "PhoneUpdateHistory_pkey" ON public."PhoneUpdateHistory" USING btree (id);

CREATE UNIQUE INDEX "ProjectAttachment_pkey" ON public."ProjectAttachment" USING btree (id);

CREATE UNIQUE INDEX "RegisterAttachment_pkey" ON public."RegisterAttachment" USING btree (id);

CREATE UNIQUE INDEX "RegisterEntry_pkey" ON public."RegisterEntry" USING btree (id);

CREATE UNIQUE INDEX "RoleModulePermissions_pkey" ON public."RoleModulePermissions" USING btree (id);

CREATE UNIQUE INDEX "RoleModulePermissions_role_id_module_key_key" ON public."RoleModulePermissions" USING btree (role_id, module_key);

CREATE UNIQUE INDEX "Role_name_key" ON public."Role" USING btree (name);

CREATE UNIQUE INDEX "Role_pkey" ON public."Role" USING btree (id);

CREATE UNIQUE INDEX "Stream_pkey" ON public."Stream" USING btree (id);

CREATE UNIQUE INDEX "Suggestion_id_pk" ON public."Suggestion" USING btree (id);

CREATE UNIQUE INDEX "TaskHistory_pkey" ON public."TaskHistory" USING btree (id);

CREATE UNIQUE INDEX "UserModulePermissions_pkey" ON public."UserModulePermissions" USING btree (id);

CREATE UNIQUE INDEX "UserPartAssignment_pkey" ON public."UserPartAssignment" USING btree (id);

CREATE UNIQUE INDEX "UserPartAssignment_user_id_election_id_booth_no_unique" ON public."UserPartAssignment" USING btree (user_id, election_id, booth_no);

CREATE UNIQUE INDEX "User_pkey" ON public."User" USING btree (id);

CREATE UNIQUE INDEX "User_user_id_unique" ON public."User" USING btree (user_id);

CREATE UNIQUE INDEX "Visitor_pkey" ON public."Visitor" USING btree (id);

CREATE UNIQUE INDEX "Vote_chatId_messageId_pk" ON public."Vote" USING btree ("chatId", "messageId");

CREATE UNIQUE INDEX "Vote_v2_chatId_messageId_pk" ON public."Vote_v2" USING btree ("chatId", "messageId");

CREATE UNIQUE INDEX "VoterMaster_pkey" ON public."VoterMaster" USING btree (epic_number);

CREATE UNIQUE INDEX "VoterMobileNumber_epic_number_mobile_number_pk" ON public."VoterMobileNumber" USING btree (epic_number, mobile_number);

CREATE UNIQUE INDEX "VoterMobileNumber_epic_number_sort_order_unique" ON public."VoterMobileNumber" USING btree (epic_number, sort_order);

CREATE UNIQUE INDEX "VoterProfile_pkey" ON public."VoterProfile" USING btree (epic_number);

CREATE UNIQUE INDEX "VoterTask_pkey" ON public."VoterTask" USING btree (id);

CREATE INDEX daily_programme_attachment_programme_id_idx ON public."DailyProgrammeAttachment" USING btree (programme_id);

CREATE INDEX daily_programme_updated_by_idx ON public."DailyProgramme" USING btree (updated_by);

CREATE INDEX export_job_created_by_idx ON public."ExportJob" USING btree (created_by);

CREATE INDEX export_job_status_idx ON public."ExportJob" USING btree (status);

CREATE INDEX idx_booth_master_election_id ON public."BoothMaster" USING btree (election_id);

CREATE INDEX idx_daily_programme_created_by ON public."DailyProgramme" USING btree (created_by);

CREATE INDEX idx_daily_programme_date ON public."DailyProgramme" USING btree (date);

CREATE INDEX idx_election_mapping_election_id ON public."ElectionMapping" USING btree (election_id);

CREATE INDEX idx_election_mapping_epic_number ON public."ElectionMapping" USING btree (epic_number);

CREATE INDEX idx_mla_project_status ON public."MlaProject" USING btree (status);

CREATE INDEX idx_project_attachment_project_id ON public."ProjectAttachment" USING btree (project_id);

CREATE INDEX idx_register_attachment_entry_id ON public."RegisterAttachment" USING btree (entry_id);

CREATE INDEX idx_register_entry_created_by ON public."RegisterEntry" USING btree (created_by);

CREATE INDEX idx_register_entry_date ON public."RegisterEntry" USING btree (date);

CREATE INDEX idx_register_entry_type ON public."RegisterEntry" USING btree (type);

CREATE INDEX idx_role_module_permissions_module_key ON public."RoleModulePermissions" USING btree (module_key);

CREATE INDEX idx_role_module_permissions_role_id ON public."RoleModulePermissions" USING btree (role_id);

CREATE INDEX idx_user_module_permissions_module_key ON public."UserModulePermissions" USING btree (module_key);

CREATE INDEX idx_user_module_permissions_user_id ON public."UserModulePermissions" USING btree ("userId");

CREATE INDEX idx_user_module_permissions_user_module ON public."UserModulePermissions" USING btree ("userId", module_key);

CREATE INDEX idx_user_part_assignment_election_id ON public."UserPartAssignment" USING btree (election_id);

CREATE INDEX idx_user_part_assignment_user_id ON public."UserPartAssignment" USING btree (user_id);

CREATE INDEX idx_user_role_id ON public."User" USING btree (role_id);

CREATE INDEX idx_user_user_id ON public."User" USING btree (user_id);

CREATE INDEX idx_visitor_aadhar_number ON public."Visitor" USING btree (aadhar_number);

CREATE INDEX idx_visitor_contact_number ON public."Visitor" USING btree (contact_number);

CREATE INDEX idx_visitor_created_by ON public."Visitor" USING btree (created_by);

CREATE INDEX idx_visitor_programme_event_id ON public."Visitor" USING btree (programme_event_id);

CREATE INDEX idx_visitor_visit_date ON public."Visitor" USING btree (visit_date);

CREATE INDEX phone_update_history_created_at_idx ON public."PhoneUpdateHistory" USING btree (created_at);

CREATE INDEX phone_update_history_epic_number_idx ON public."PhoneUpdateHistory" USING btree (epic_number);

CREATE INDEX phone_update_history_source_module_idx ON public."PhoneUpdateHistory" USING btree (source_module);

CREATE INDEX phone_update_history_updated_by_idx ON public."PhoneUpdateHistory" USING btree (updated_by);

CREATE INDEX voter_mobile_number_epic_number_idx ON public."VoterMobileNumber" USING btree (epic_number);

CREATE INDEX voter_task_created_by_idx ON public."VoterTask" USING btree (created_by);

CREATE INDEX voter_task_updated_by_idx ON public."VoterTask" USING btree (updated_by);

alter table "drizzle"."__drizzle_migrations" add constraint "__drizzle_migrations_pkey" PRIMARY KEY using index "__drizzle_migrations_pkey";

alter table "neon_auth"."users_sync" add constraint "users_sync_pkey" PRIMARY KEY using index "users_sync_pkey";

alter table "public"."BeneficiaryService" add constraint "BeneficiaryService_pkey" PRIMARY KEY using index "BeneficiaryService_pkey";

alter table "public"."BoothMaster" add constraint "BoothMaster_election_id_booth_no_pk" PRIMARY KEY using index "BoothMaster_election_id_booth_no_pk";

alter table "public"."Chat" add constraint "Chat_pkey" PRIMARY KEY using index "Chat_pkey";

alter table "public"."CommunityServiceArea" add constraint "CommunityServiceArea_pkey" PRIMARY KEY using index "CommunityServiceArea_pkey";

alter table "public"."DailyProgramme" add constraint "DailyProgramme_pkey" PRIMARY KEY using index "DailyProgramme_pkey";

alter table "public"."DailyProgrammeAttachment" add constraint "DailyProgrammeAttachment_pkey" PRIMARY KEY using index "DailyProgrammeAttachment_pkey";

alter table "public"."Document" add constraint "Document_id_createdAt_pk" PRIMARY KEY using index "Document_id_createdAt_pk";

alter table "public"."ElectionMapping" add constraint "ElectionMapping_epic_number_election_id_pk" PRIMARY KEY using index "ElectionMapping_epic_number_election_id_pk";

alter table "public"."ElectionMaster" add constraint "ElectionMaster_pkey" PRIMARY KEY using index "ElectionMaster_pkey";

alter table "public"."ExportJob" add constraint "ExportJob_pkey" PRIMARY KEY using index "ExportJob_pkey";

alter table "public"."Message" add constraint "Message_pkey" PRIMARY KEY using index "Message_pkey";

alter table "public"."Message_v2" add constraint "Message_v2_pkey" PRIMARY KEY using index "Message_v2_pkey";

alter table "public"."MlaProject" add constraint "MlaProject_pkey" PRIMARY KEY using index "MlaProject_pkey";

alter table "public"."PartNo" add constraint "PartNo_pkey" PRIMARY KEY using index "PartNo_pkey";

alter table "public"."PhoneUpdateHistory" add constraint "PhoneUpdateHistory_pkey" PRIMARY KEY using index "PhoneUpdateHistory_pkey";

alter table "public"."ProjectAttachment" add constraint "ProjectAttachment_pkey" PRIMARY KEY using index "ProjectAttachment_pkey";

alter table "public"."RegisterAttachment" add constraint "RegisterAttachment_pkey" PRIMARY KEY using index "RegisterAttachment_pkey";

alter table "public"."RegisterEntry" add constraint "RegisterEntry_pkey" PRIMARY KEY using index "RegisterEntry_pkey";

alter table "public"."Role" add constraint "Role_pkey" PRIMARY KEY using index "Role_pkey";

alter table "public"."RoleModulePermissions" add constraint "RoleModulePermissions_pkey" PRIMARY KEY using index "RoleModulePermissions_pkey";

alter table "public"."Stream" add constraint "Stream_pkey" PRIMARY KEY using index "Stream_pkey";

alter table "public"."Suggestion" add constraint "Suggestion_id_pk" PRIMARY KEY using index "Suggestion_id_pk";

alter table "public"."TaskHistory" add constraint "TaskHistory_pkey" PRIMARY KEY using index "TaskHistory_pkey";

alter table "public"."User" add constraint "User_pkey" PRIMARY KEY using index "User_pkey";

alter table "public"."UserModulePermissions" add constraint "UserModulePermissions_pkey" PRIMARY KEY using index "UserModulePermissions_pkey";

alter table "public"."UserPartAssignment" add constraint "UserPartAssignment_pkey" PRIMARY KEY using index "UserPartAssignment_pkey";

alter table "public"."Visitor" add constraint "Visitor_pkey" PRIMARY KEY using index "Visitor_pkey";

alter table "public"."Vote" add constraint "Vote_chatId_messageId_pk" PRIMARY KEY using index "Vote_chatId_messageId_pk";

alter table "public"."Vote_v2" add constraint "Vote_v2_chatId_messageId_pk" PRIMARY KEY using index "Vote_v2_chatId_messageId_pk";

alter table "public"."VoterMaster" add constraint "VoterMaster_pkey" PRIMARY KEY using index "VoterMaster_pkey";

alter table "public"."VoterMobileNumber" add constraint "VoterMobileNumber_epic_number_mobile_number_pk" PRIMARY KEY using index "VoterMobileNumber_epic_number_mobile_number_pk";

alter table "public"."VoterProfile" add constraint "VoterProfile_pkey" PRIMARY KEY using index "VoterProfile_pkey";

alter table "public"."VoterTask" add constraint "VoterTask_pkey" PRIMARY KEY using index "VoterTask_pkey";

alter table "public"."BeneficiaryService" add constraint "BeneficiaryService_assigned_to_User_id_fk" FOREIGN KEY (assigned_to) REFERENCES public."User"(id) not valid;

alter table "public"."BeneficiaryService" validate constraint "BeneficiaryService_assigned_to_User_id_fk";

alter table "public"."BeneficiaryService" add constraint "BeneficiaryService_requested_by_User_id_fk" FOREIGN KEY (requested_by) REFERENCES public."User"(id) not valid;

alter table "public"."BeneficiaryService" validate constraint "BeneficiaryService_requested_by_User_id_fk";

alter table "public"."BeneficiaryService" add constraint "BeneficiaryService_voter_id_VoterMaster_epic_number_fk" FOREIGN KEY (voter_id) REFERENCES public."VoterMaster"(epic_number) not valid;

alter table "public"."BeneficiaryService" validate constraint "BeneficiaryService_voter_id_VoterMaster_epic_number_fk";

alter table "public"."BoothMaster" add constraint "BoothMaster_election_id_ElectionMaster_election_id_fk" FOREIGN KEY (election_id) REFERENCES public."ElectionMaster"(election_id) ON DELETE CASCADE not valid;

alter table "public"."BoothMaster" validate constraint "BoothMaster_election_id_ElectionMaster_election_id_fk";

alter table "public"."Chat" add constraint "Chat_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES public."User"(id) not valid;

alter table "public"."Chat" validate constraint "Chat_userId_User_id_fk";

alter table "public"."CommunityServiceArea" add constraint "CommunityServiceArea_service_id_BeneficiaryService_id_fk" FOREIGN KEY (service_id) REFERENCES public."BeneficiaryService"(id) not valid;

alter table "public"."CommunityServiceArea" validate constraint "CommunityServiceArea_service_id_BeneficiaryService_id_fk";

alter table "public"."DailyProgramme" add constraint "DailyProgramme_created_by_User_id_fk" FOREIGN KEY (created_by) REFERENCES public."User"(id) not valid;

alter table "public"."DailyProgramme" validate constraint "DailyProgramme_created_by_User_id_fk";

alter table "public"."DailyProgramme" add constraint "DailyProgramme_updated_by_User_id_fk" FOREIGN KEY (updated_by) REFERENCES public."User"(id) not valid;

alter table "public"."DailyProgramme" validate constraint "DailyProgramme_updated_by_User_id_fk";

alter table "public"."DailyProgrammeAttachment" add constraint "DailyProgrammeAttachment_programme_id_fkey" FOREIGN KEY (programme_id) REFERENCES public."DailyProgramme"(id) ON DELETE CASCADE not valid;

alter table "public"."DailyProgrammeAttachment" validate constraint "DailyProgrammeAttachment_programme_id_fkey";

alter table "public"."Document" add constraint "Document_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES public."User"(id) not valid;

alter table "public"."Document" validate constraint "Document_userId_User_id_fk";

alter table "public"."ElectionMapping" add constraint "ElectionMapping_election_id_ElectionMaster_election_id_fk" FOREIGN KEY (election_id) REFERENCES public."ElectionMaster"(election_id) ON DELETE CASCADE not valid;

alter table "public"."ElectionMapping" validate constraint "ElectionMapping_election_id_ElectionMaster_election_id_fk";

alter table "public"."ElectionMapping" add constraint "ElectionMapping_epic_number_VoterMaster_epic_number_fk" FOREIGN KEY (epic_number) REFERENCES public."VoterMaster"(epic_number) ON DELETE CASCADE not valid;

alter table "public"."ElectionMapping" validate constraint "ElectionMapping_epic_number_VoterMaster_epic_number_fk";

alter table "public"."ElectionMapping" add constraint "ElectionMapping_epic_number_fkey" FOREIGN KEY (epic_number) REFERENCES public."VoterMaster"(epic_number) ON DELETE CASCADE not valid;

alter table "public"."ElectionMapping" validate constraint "ElectionMapping_epic_number_fkey";

alter table "public"."ExportJob" add constraint "ExportJob_created_by_User_id_fk" FOREIGN KEY (created_by) REFERENCES public."User"(id) not valid;

alter table "public"."ExportJob" validate constraint "ExportJob_created_by_User_id_fk";

alter table "public"."ExportJob" add constraint "ExportJob_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public."User"(id) not valid;

alter table "public"."ExportJob" validate constraint "ExportJob_created_by_fkey";

alter table "public"."Message" add constraint "Message_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES public."Chat"(id) not valid;

alter table "public"."Message" validate constraint "Message_chatId_Chat_id_fk";

alter table "public"."Message_v2" add constraint "Message_v2_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES public."Chat"(id) not valid;

alter table "public"."Message_v2" validate constraint "Message_v2_chatId_Chat_id_fk";

alter table "public"."MlaProject" add constraint "MlaProject_created_by_User_id_fk" FOREIGN KEY (created_by) REFERENCES public."User"(id) not valid;

alter table "public"."MlaProject" validate constraint "MlaProject_created_by_User_id_fk";

alter table "public"."PhoneUpdateHistory" add constraint "PhoneUpdateHistory_epic_number_VoterMaster_epic_number_fk" FOREIGN KEY (epic_number) REFERENCES public."VoterMaster"(epic_number) ON DELETE CASCADE not valid;

alter table "public"."PhoneUpdateHistory" validate constraint "PhoneUpdateHistory_epic_number_VoterMaster_epic_number_fk";

alter table "public"."PhoneUpdateHistory" add constraint "PhoneUpdateHistory_updated_by_User_id_fk" FOREIGN KEY (updated_by) REFERENCES public."User"(id) not valid;

alter table "public"."PhoneUpdateHistory" validate constraint "PhoneUpdateHistory_updated_by_User_id_fk";

alter table "public"."ProjectAttachment" add constraint "ProjectAttachment_project_id_MlaProject_id_fk" FOREIGN KEY (project_id) REFERENCES public."MlaProject"(id) ON DELETE CASCADE not valid;

alter table "public"."ProjectAttachment" validate constraint "ProjectAttachment_project_id_MlaProject_id_fk";

alter table "public"."RegisterAttachment" add constraint "RegisterAttachment_entry_id_RegisterEntry_id_fk" FOREIGN KEY (entry_id) REFERENCES public."RegisterEntry"(id) ON DELETE CASCADE not valid;

alter table "public"."RegisterAttachment" validate constraint "RegisterAttachment_entry_id_RegisterEntry_id_fk";

alter table "public"."RegisterEntry" add constraint "RegisterEntry_created_by_User_id_fk" FOREIGN KEY (created_by) REFERENCES public."User"(id) not valid;

alter table "public"."RegisterEntry" validate constraint "RegisterEntry_created_by_User_id_fk";

alter table "public"."RegisterEntry" add constraint "RegisterEntry_project_id_MlaProject_id_fk" FOREIGN KEY (project_id) REFERENCES public."MlaProject"(id) not valid;

alter table "public"."RegisterEntry" validate constraint "RegisterEntry_project_id_MlaProject_id_fk";

alter table "public"."Role" add constraint "Role_name_key" UNIQUE using index "Role_name_key";

alter table "public"."RoleModulePermissions" add constraint "RoleModulePermissions_role_id_Role_id_fk" FOREIGN KEY (role_id) REFERENCES public."Role"(id) ON DELETE CASCADE not valid;

alter table "public"."RoleModulePermissions" validate constraint "RoleModulePermissions_role_id_Role_id_fk";

alter table "public"."RoleModulePermissions" add constraint "RoleModulePermissions_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public."Role"(id) ON DELETE CASCADE not valid;

alter table "public"."RoleModulePermissions" validate constraint "RoleModulePermissions_role_id_fkey";

alter table "public"."RoleModulePermissions" add constraint "RoleModulePermissions_role_id_module_key_key" UNIQUE using index "RoleModulePermissions_role_id_module_key_key";

alter table "public"."Stream" add constraint "Stream_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES public."Chat"(id) not valid;

alter table "public"."Stream" validate constraint "Stream_chatId_Chat_id_fk";

alter table "public"."Suggestion" add constraint "Suggestion_documentId_documentCreatedAt_Document_id_createdAt_f" FOREIGN KEY ("documentId", "documentCreatedAt") REFERENCES public."Document"(id, "createdAt") not valid;

alter table "public"."Suggestion" validate constraint "Suggestion_documentId_documentCreatedAt_Document_id_createdAt_f";

alter table "public"."Suggestion" add constraint "Suggestion_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES public."User"(id) not valid;

alter table "public"."Suggestion" validate constraint "Suggestion_userId_User_id_fk";

alter table "public"."TaskHistory" add constraint "TaskHistory_performed_by_User_id_fk" FOREIGN KEY (performed_by) REFERENCES public."User"(id) not valid;

alter table "public"."TaskHistory" validate constraint "TaskHistory_performed_by_User_id_fk";

alter table "public"."TaskHistory" add constraint "TaskHistory_task_id_VoterTask_id_fk" FOREIGN KEY (task_id) REFERENCES public."VoterTask"(id) not valid;

alter table "public"."TaskHistory" validate constraint "TaskHistory_task_id_VoterTask_id_fk";

alter table "public"."User" add constraint "User_role_id_Role_id_fk" FOREIGN KEY (role_id) REFERENCES public."Role"(id) ON DELETE RESTRICT not valid;

alter table "public"."User" validate constraint "User_role_id_Role_id_fk";

alter table "public"."User" add constraint "User_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public."Role"(id) ON DELETE RESTRICT not valid;

alter table "public"."User" validate constraint "User_role_id_fkey";

alter table "public"."User" add constraint "User_user_id_unique" UNIQUE using index "User_user_id_unique";

alter table "public"."UserModulePermissions" add constraint "UserModulePermissions_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON DELETE CASCADE not valid;

alter table "public"."UserModulePermissions" validate constraint "UserModulePermissions_userId_User_id_fk";

alter table "public"."UserPartAssignment" add constraint "UserPartAssignment_election_id_ElectionMaster_election_id_fk" FOREIGN KEY (election_id) REFERENCES public."ElectionMaster"(election_id) ON DELETE CASCADE not valid;

alter table "public"."UserPartAssignment" validate constraint "UserPartAssignment_election_id_ElectionMaster_election_id_fk";

alter table "public"."UserPartAssignment" add constraint "UserPartAssignment_user_id_User_id_fk" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE CASCADE not valid;

alter table "public"."UserPartAssignment" validate constraint "UserPartAssignment_user_id_User_id_fk";

alter table "public"."UserPartAssignment" add constraint "UserPartAssignment_user_id_election_id_booth_no_unique" UNIQUE using index "UserPartAssignment_user_id_election_id_booth_no_unique";

alter table "public"."Visitor" add constraint "Visitor_created_by_User_id_fk" FOREIGN KEY (created_by) REFERENCES public."User"(id) not valid;

alter table "public"."Visitor" validate constraint "Visitor_created_by_User_id_fk";

alter table "public"."Visitor" add constraint "Visitor_programme_event_id_DailyProgramme_id_fk" FOREIGN KEY (programme_event_id) REFERENCES public."DailyProgramme"(id) ON DELETE SET NULL not valid;

alter table "public"."Visitor" validate constraint "Visitor_programme_event_id_DailyProgramme_id_fk";

alter table "public"."Vote" add constraint "Vote_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES public."Chat"(id) not valid;

alter table "public"."Vote" validate constraint "Vote_chatId_Chat_id_fk";

alter table "public"."Vote" add constraint "Vote_messageId_Message_id_fk" FOREIGN KEY ("messageId") REFERENCES public."Message"(id) not valid;

alter table "public"."Vote" validate constraint "Vote_messageId_Message_id_fk";

alter table "public"."Vote_v2" add constraint "Vote_v2_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES public."Chat"(id) not valid;

alter table "public"."Vote_v2" validate constraint "Vote_v2_chatId_Chat_id_fk";

alter table "public"."Vote_v2" add constraint "Vote_v2_messageId_Message_v2_id_fk" FOREIGN KEY ("messageId") REFERENCES public."Message_v2"(id) not valid;

alter table "public"."Vote_v2" validate constraint "Vote_v2_messageId_Message_v2_id_fk";

alter table "public"."VoterMobileNumber" add constraint "VoterMobileNumber_epic_number_VoterMaster_epic_number_fk" FOREIGN KEY (epic_number) REFERENCES public."VoterMaster"(epic_number) ON DELETE CASCADE not valid;

alter table "public"."VoterMobileNumber" validate constraint "VoterMobileNumber_epic_number_VoterMaster_epic_number_fk";

alter table "public"."VoterMobileNumber" add constraint "VoterMobileNumber_epic_number_sort_order_unique" UNIQUE using index "VoterMobileNumber_epic_number_sort_order_unique";

alter table "public"."VoterMobileNumber" add constraint "voter_mobile_number_sort_order_check" CHECK (((sort_order >= 1) AND (sort_order <= 5))) not valid;

alter table "public"."VoterMobileNumber" validate constraint "voter_mobile_number_sort_order_check";

alter table "public"."VoterProfile" add constraint "VoterProfile_epic_number_VoterMaster_epic_number_fk" FOREIGN KEY (epic_number) REFERENCES public."VoterMaster"(epic_number) ON DELETE CASCADE not valid;

alter table "public"."VoterProfile" validate constraint "VoterProfile_epic_number_VoterMaster_epic_number_fk";

alter table "public"."VoterProfile" add constraint "VoterProfile_influencer_type_check" CHECK (((influencer_type)::text = ANY (ARRAY[('political'::character varying)::text, ('local'::character varying)::text, ('education'::character varying)::text, ('religious'::character varying)::text]))) not valid;

alter table "public"."VoterProfile" validate constraint "VoterProfile_influencer_type_check";

alter table "public"."VoterProfile" add constraint "VoterProfile_occupation_type_check" CHECK (((occupation_type)::text = ANY (ARRAY[('business'::character varying)::text, ('service'::character varying)::text]))) not valid;

alter table "public"."VoterProfile" validate constraint "VoterProfile_occupation_type_check";

alter table "public"."VoterProfile" add constraint "VoterProfile_profiled_by_User_id_fk" FOREIGN KEY (profiled_by) REFERENCES public."User"(id) not valid;

alter table "public"."VoterProfile" validate constraint "VoterProfile_profiled_by_User_id_fk";

alter table "public"."VoterProfile" add constraint "VoterProfile_vehicle_type_check" CHECK (((vehicle_type)::text = ANY (ARRAY[('2w'::character varying)::text, ('4w'::character varying)::text, ('both'::character varying)::text]))) not valid;

alter table "public"."VoterProfile" validate constraint "VoterProfile_vehicle_type_check";

alter table "public"."VoterTask" add constraint "VoterTask_assigned_to_User_id_fk" FOREIGN KEY (assigned_to) REFERENCES public."User"(id) not valid;

alter table "public"."VoterTask" validate constraint "VoterTask_assigned_to_User_id_fk";

alter table "public"."VoterTask" add constraint "VoterTask_created_by_User_id_fk" FOREIGN KEY (created_by) REFERENCES public."User"(id) not valid;

alter table "public"."VoterTask" validate constraint "VoterTask_created_by_User_id_fk";

alter table "public"."VoterTask" add constraint "VoterTask_service_id_BeneficiaryService_id_fk" FOREIGN KEY (service_id) REFERENCES public."BeneficiaryService"(id) not valid;

alter table "public"."VoterTask" validate constraint "VoterTask_service_id_BeneficiaryService_id_fk";

alter table "public"."VoterTask" add constraint "VoterTask_updated_by_User_id_fk" FOREIGN KEY (updated_by) REFERENCES public."User"(id) not valid;

alter table "public"."VoterTask" validate constraint "VoterTask_updated_by_User_id_fk";

alter table "public"."VoterTask" add constraint "VoterTask_voter_id_VoterMaster_epic_number_fk" FOREIGN KEY (voter_id) REFERENCES public."VoterMaster"(epic_number) not valid;

alter table "public"."VoterTask" validate constraint "VoterTask_voter_id_VoterMaster_epic_number_fk";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.sync_beneficiary_service_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    service_uuid uuid;
    task_statuses text[];
    new_service_status text;
    all_completed boolean;
    all_cancelled boolean;
    has_in_progress boolean;
    has_pending boolean;
    has_cancelled boolean;
    has_active boolean;
BEGIN
    -- Get the service_id from the trigger context
    -- NEW is available for INSERT/UPDATE, OLD for DELETE
    IF TG_OP = 'DELETE' THEN
        service_uuid := OLD.service_id;
    ELSE
        service_uuid := NEW.service_id;
    END IF;

    -- Skip if service_id is NULL
    IF service_uuid IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Get all task statuses for this service
    SELECT ARRAY_AGG(status)
    INTO task_statuses
    FROM "VoterTask"
    WHERE service_id = service_uuid;

    -- If no tasks exist, don't change service status (or set to pending if you prefer)
    IF task_statuses IS NULL OR array_length(task_statuses, 1) IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Calculate flags
    all_completed := true;
    all_cancelled := true;
    has_in_progress := false;
    has_pending := false;
    has_cancelled := false;
    has_active := false;

    -- Check each status
    FOR i IN 1..array_length(task_statuses, 1) LOOP
        IF task_statuses[i] != 'completed' THEN
            all_completed := false;
        END IF;
        IF task_statuses[i] != 'cancelled' THEN
            all_cancelled := false;
        END IF;
        IF task_statuses[i] = 'in_progress' THEN
            has_in_progress := true;
        END IF;
        IF task_statuses[i] = 'pending' THEN
            has_pending := true;
        END IF;
        IF task_statuses[i] = 'cancelled' THEN
            has_cancelled := true;
        END IF;
        IF task_statuses[i] IN ('pending', 'in_progress') THEN
            has_active := true;
        END IF;
    END LOOP;

    -- Determine new service status based on task statuses
    -- Priority: completed > cancelled > in_progress > pending
    IF all_completed THEN
        new_service_status := 'completed';
    ELSIF all_cancelled THEN
        new_service_status := 'cancelled';
    ELSIF has_in_progress THEN
        new_service_status := 'in_progress';
    ELSIF has_pending THEN
        new_service_status := 'pending';
    ELSIF has_cancelled AND NOT has_active THEN
        -- Some cancelled, but no active tasks
        new_service_status := 'cancelled';
    ELSE
        -- Fallback to pending
        new_service_status := 'pending';
    END IF;

    -- Update the service status (only if it changed)
    UPDATE "BeneficiaryService"
    SET 
        status = new_service_status,
        updated_at = NOW(),
        completed_at = CASE 
            WHEN new_service_status = 'completed' AND completed_at IS NULL THEN NOW()
            WHEN new_service_status != 'completed' THEN NULL
            ELSE completed_at
        END
    WHERE id = service_uuid
      AND status != new_service_status;

    RETURN COALESCE(NEW, OLD);
END;
$function$
;

grant delete on table "public"."BeneficiaryService" to "anon";

grant insert on table "public"."BeneficiaryService" to "anon";

grant references on table "public"."BeneficiaryService" to "anon";

grant select on table "public"."BeneficiaryService" to "anon";

grant trigger on table "public"."BeneficiaryService" to "anon";

grant truncate on table "public"."BeneficiaryService" to "anon";

grant update on table "public"."BeneficiaryService" to "anon";

grant delete on table "public"."BeneficiaryService" to "authenticated";

grant insert on table "public"."BeneficiaryService" to "authenticated";

grant references on table "public"."BeneficiaryService" to "authenticated";

grant select on table "public"."BeneficiaryService" to "authenticated";

grant trigger on table "public"."BeneficiaryService" to "authenticated";

grant truncate on table "public"."BeneficiaryService" to "authenticated";

grant update on table "public"."BeneficiaryService" to "authenticated";

grant delete on table "public"."BeneficiaryService" to "service_role";

grant insert on table "public"."BeneficiaryService" to "service_role";

grant references on table "public"."BeneficiaryService" to "service_role";

grant select on table "public"."BeneficiaryService" to "service_role";

grant trigger on table "public"."BeneficiaryService" to "service_role";

grant truncate on table "public"."BeneficiaryService" to "service_role";

grant update on table "public"."BeneficiaryService" to "service_role";

grant delete on table "public"."BoothMaster" to "anon";

grant insert on table "public"."BoothMaster" to "anon";

grant references on table "public"."BoothMaster" to "anon";

grant select on table "public"."BoothMaster" to "anon";

grant trigger on table "public"."BoothMaster" to "anon";

grant truncate on table "public"."BoothMaster" to "anon";

grant update on table "public"."BoothMaster" to "anon";

grant delete on table "public"."BoothMaster" to "authenticated";

grant insert on table "public"."BoothMaster" to "authenticated";

grant references on table "public"."BoothMaster" to "authenticated";

grant select on table "public"."BoothMaster" to "authenticated";

grant trigger on table "public"."BoothMaster" to "authenticated";

grant truncate on table "public"."BoothMaster" to "authenticated";

grant update on table "public"."BoothMaster" to "authenticated";

grant delete on table "public"."BoothMaster" to "service_role";

grant insert on table "public"."BoothMaster" to "service_role";

grant references on table "public"."BoothMaster" to "service_role";

grant select on table "public"."BoothMaster" to "service_role";

grant trigger on table "public"."BoothMaster" to "service_role";

grant truncate on table "public"."BoothMaster" to "service_role";

grant update on table "public"."BoothMaster" to "service_role";

grant delete on table "public"."Chat" to "anon";

grant insert on table "public"."Chat" to "anon";

grant references on table "public"."Chat" to "anon";

grant select on table "public"."Chat" to "anon";

grant trigger on table "public"."Chat" to "anon";

grant truncate on table "public"."Chat" to "anon";

grant update on table "public"."Chat" to "anon";

grant delete on table "public"."Chat" to "authenticated";

grant insert on table "public"."Chat" to "authenticated";

grant references on table "public"."Chat" to "authenticated";

grant select on table "public"."Chat" to "authenticated";

grant trigger on table "public"."Chat" to "authenticated";

grant truncate on table "public"."Chat" to "authenticated";

grant update on table "public"."Chat" to "authenticated";

grant delete on table "public"."Chat" to "service_role";

grant insert on table "public"."Chat" to "service_role";

grant references on table "public"."Chat" to "service_role";

grant select on table "public"."Chat" to "service_role";

grant trigger on table "public"."Chat" to "service_role";

grant truncate on table "public"."Chat" to "service_role";

grant update on table "public"."Chat" to "service_role";

grant delete on table "public"."CommunityServiceArea" to "anon";

grant insert on table "public"."CommunityServiceArea" to "anon";

grant references on table "public"."CommunityServiceArea" to "anon";

grant select on table "public"."CommunityServiceArea" to "anon";

grant trigger on table "public"."CommunityServiceArea" to "anon";

grant truncate on table "public"."CommunityServiceArea" to "anon";

grant update on table "public"."CommunityServiceArea" to "anon";

grant delete on table "public"."CommunityServiceArea" to "authenticated";

grant insert on table "public"."CommunityServiceArea" to "authenticated";

grant references on table "public"."CommunityServiceArea" to "authenticated";

grant select on table "public"."CommunityServiceArea" to "authenticated";

grant trigger on table "public"."CommunityServiceArea" to "authenticated";

grant truncate on table "public"."CommunityServiceArea" to "authenticated";

grant update on table "public"."CommunityServiceArea" to "authenticated";

grant delete on table "public"."CommunityServiceArea" to "service_role";

grant insert on table "public"."CommunityServiceArea" to "service_role";

grant references on table "public"."CommunityServiceArea" to "service_role";

grant select on table "public"."CommunityServiceArea" to "service_role";

grant trigger on table "public"."CommunityServiceArea" to "service_role";

grant truncate on table "public"."CommunityServiceArea" to "service_role";

grant update on table "public"."CommunityServiceArea" to "service_role";

grant delete on table "public"."DailyProgramme" to "anon";

grant insert on table "public"."DailyProgramme" to "anon";

grant references on table "public"."DailyProgramme" to "anon";

grant select on table "public"."DailyProgramme" to "anon";

grant trigger on table "public"."DailyProgramme" to "anon";

grant truncate on table "public"."DailyProgramme" to "anon";

grant update on table "public"."DailyProgramme" to "anon";

grant delete on table "public"."DailyProgramme" to "authenticated";

grant insert on table "public"."DailyProgramme" to "authenticated";

grant references on table "public"."DailyProgramme" to "authenticated";

grant select on table "public"."DailyProgramme" to "authenticated";

grant trigger on table "public"."DailyProgramme" to "authenticated";

grant truncate on table "public"."DailyProgramme" to "authenticated";

grant update on table "public"."DailyProgramme" to "authenticated";

grant delete on table "public"."DailyProgramme" to "service_role";

grant insert on table "public"."DailyProgramme" to "service_role";

grant references on table "public"."DailyProgramme" to "service_role";

grant select on table "public"."DailyProgramme" to "service_role";

grant trigger on table "public"."DailyProgramme" to "service_role";

grant truncate on table "public"."DailyProgramme" to "service_role";

grant update on table "public"."DailyProgramme" to "service_role";

grant delete on table "public"."DailyProgrammeAttachment" to "anon";

grant insert on table "public"."DailyProgrammeAttachment" to "anon";

grant references on table "public"."DailyProgrammeAttachment" to "anon";

grant select on table "public"."DailyProgrammeAttachment" to "anon";

grant trigger on table "public"."DailyProgrammeAttachment" to "anon";

grant truncate on table "public"."DailyProgrammeAttachment" to "anon";

grant update on table "public"."DailyProgrammeAttachment" to "anon";

grant delete on table "public"."DailyProgrammeAttachment" to "authenticated";

grant insert on table "public"."DailyProgrammeAttachment" to "authenticated";

grant references on table "public"."DailyProgrammeAttachment" to "authenticated";

grant select on table "public"."DailyProgrammeAttachment" to "authenticated";

grant trigger on table "public"."DailyProgrammeAttachment" to "authenticated";

grant truncate on table "public"."DailyProgrammeAttachment" to "authenticated";

grant update on table "public"."DailyProgrammeAttachment" to "authenticated";

grant delete on table "public"."DailyProgrammeAttachment" to "service_role";

grant insert on table "public"."DailyProgrammeAttachment" to "service_role";

grant references on table "public"."DailyProgrammeAttachment" to "service_role";

grant select on table "public"."DailyProgrammeAttachment" to "service_role";

grant trigger on table "public"."DailyProgrammeAttachment" to "service_role";

grant truncate on table "public"."DailyProgrammeAttachment" to "service_role";

grant update on table "public"."DailyProgrammeAttachment" to "service_role";

grant delete on table "public"."Document" to "anon";

grant insert on table "public"."Document" to "anon";

grant references on table "public"."Document" to "anon";

grant select on table "public"."Document" to "anon";

grant trigger on table "public"."Document" to "anon";

grant truncate on table "public"."Document" to "anon";

grant update on table "public"."Document" to "anon";

grant delete on table "public"."Document" to "authenticated";

grant insert on table "public"."Document" to "authenticated";

grant references on table "public"."Document" to "authenticated";

grant select on table "public"."Document" to "authenticated";

grant trigger on table "public"."Document" to "authenticated";

grant truncate on table "public"."Document" to "authenticated";

grant update on table "public"."Document" to "authenticated";

grant delete on table "public"."Document" to "service_role";

grant insert on table "public"."Document" to "service_role";

grant references on table "public"."Document" to "service_role";

grant select on table "public"."Document" to "service_role";

grant trigger on table "public"."Document" to "service_role";

grant truncate on table "public"."Document" to "service_role";

grant update on table "public"."Document" to "service_role";

grant delete on table "public"."ElectionMapping" to "anon";

grant insert on table "public"."ElectionMapping" to "anon";

grant references on table "public"."ElectionMapping" to "anon";

grant select on table "public"."ElectionMapping" to "anon";

grant trigger on table "public"."ElectionMapping" to "anon";

grant truncate on table "public"."ElectionMapping" to "anon";

grant update on table "public"."ElectionMapping" to "anon";

grant delete on table "public"."ElectionMapping" to "authenticated";

grant insert on table "public"."ElectionMapping" to "authenticated";

grant references on table "public"."ElectionMapping" to "authenticated";

grant select on table "public"."ElectionMapping" to "authenticated";

grant trigger on table "public"."ElectionMapping" to "authenticated";

grant truncate on table "public"."ElectionMapping" to "authenticated";

grant update on table "public"."ElectionMapping" to "authenticated";

grant delete on table "public"."ElectionMapping" to "service_role";

grant insert on table "public"."ElectionMapping" to "service_role";

grant references on table "public"."ElectionMapping" to "service_role";

grant select on table "public"."ElectionMapping" to "service_role";

grant trigger on table "public"."ElectionMapping" to "service_role";

grant truncate on table "public"."ElectionMapping" to "service_role";

grant update on table "public"."ElectionMapping" to "service_role";

grant delete on table "public"."ElectionMaster" to "anon";

grant insert on table "public"."ElectionMaster" to "anon";

grant references on table "public"."ElectionMaster" to "anon";

grant select on table "public"."ElectionMaster" to "anon";

grant trigger on table "public"."ElectionMaster" to "anon";

grant truncate on table "public"."ElectionMaster" to "anon";

grant update on table "public"."ElectionMaster" to "anon";

grant delete on table "public"."ElectionMaster" to "authenticated";

grant insert on table "public"."ElectionMaster" to "authenticated";

grant references on table "public"."ElectionMaster" to "authenticated";

grant select on table "public"."ElectionMaster" to "authenticated";

grant trigger on table "public"."ElectionMaster" to "authenticated";

grant truncate on table "public"."ElectionMaster" to "authenticated";

grant update on table "public"."ElectionMaster" to "authenticated";

grant delete on table "public"."ElectionMaster" to "service_role";

grant insert on table "public"."ElectionMaster" to "service_role";

grant references on table "public"."ElectionMaster" to "service_role";

grant select on table "public"."ElectionMaster" to "service_role";

grant trigger on table "public"."ElectionMaster" to "service_role";

grant truncate on table "public"."ElectionMaster" to "service_role";

grant update on table "public"."ElectionMaster" to "service_role";

grant delete on table "public"."ExportJob" to "anon";

grant insert on table "public"."ExportJob" to "anon";

grant references on table "public"."ExportJob" to "anon";

grant select on table "public"."ExportJob" to "anon";

grant trigger on table "public"."ExportJob" to "anon";

grant truncate on table "public"."ExportJob" to "anon";

grant update on table "public"."ExportJob" to "anon";

grant delete on table "public"."ExportJob" to "authenticated";

grant insert on table "public"."ExportJob" to "authenticated";

grant references on table "public"."ExportJob" to "authenticated";

grant select on table "public"."ExportJob" to "authenticated";

grant trigger on table "public"."ExportJob" to "authenticated";

grant truncate on table "public"."ExportJob" to "authenticated";

grant update on table "public"."ExportJob" to "authenticated";

grant delete on table "public"."ExportJob" to "service_role";

grant insert on table "public"."ExportJob" to "service_role";

grant references on table "public"."ExportJob" to "service_role";

grant select on table "public"."ExportJob" to "service_role";

grant trigger on table "public"."ExportJob" to "service_role";

grant truncate on table "public"."ExportJob" to "service_role";

grant update on table "public"."ExportJob" to "service_role";

grant delete on table "public"."Message" to "anon";

grant insert on table "public"."Message" to "anon";

grant references on table "public"."Message" to "anon";

grant select on table "public"."Message" to "anon";

grant trigger on table "public"."Message" to "anon";

grant truncate on table "public"."Message" to "anon";

grant update on table "public"."Message" to "anon";

grant delete on table "public"."Message" to "authenticated";

grant insert on table "public"."Message" to "authenticated";

grant references on table "public"."Message" to "authenticated";

grant select on table "public"."Message" to "authenticated";

grant trigger on table "public"."Message" to "authenticated";

grant truncate on table "public"."Message" to "authenticated";

grant update on table "public"."Message" to "authenticated";

grant delete on table "public"."Message" to "service_role";

grant insert on table "public"."Message" to "service_role";

grant references on table "public"."Message" to "service_role";

grant select on table "public"."Message" to "service_role";

grant trigger on table "public"."Message" to "service_role";

grant truncate on table "public"."Message" to "service_role";

grant update on table "public"."Message" to "service_role";

grant delete on table "public"."Message_v2" to "anon";

grant insert on table "public"."Message_v2" to "anon";

grant references on table "public"."Message_v2" to "anon";

grant select on table "public"."Message_v2" to "anon";

grant trigger on table "public"."Message_v2" to "anon";

grant truncate on table "public"."Message_v2" to "anon";

grant update on table "public"."Message_v2" to "anon";

grant delete on table "public"."Message_v2" to "authenticated";

grant insert on table "public"."Message_v2" to "authenticated";

grant references on table "public"."Message_v2" to "authenticated";

grant select on table "public"."Message_v2" to "authenticated";

grant trigger on table "public"."Message_v2" to "authenticated";

grant truncate on table "public"."Message_v2" to "authenticated";

grant update on table "public"."Message_v2" to "authenticated";

grant delete on table "public"."Message_v2" to "service_role";

grant insert on table "public"."Message_v2" to "service_role";

grant references on table "public"."Message_v2" to "service_role";

grant select on table "public"."Message_v2" to "service_role";

grant trigger on table "public"."Message_v2" to "service_role";

grant truncate on table "public"."Message_v2" to "service_role";

grant update on table "public"."Message_v2" to "service_role";

grant delete on table "public"."MlaProject" to "anon";

grant insert on table "public"."MlaProject" to "anon";

grant references on table "public"."MlaProject" to "anon";

grant select on table "public"."MlaProject" to "anon";

grant trigger on table "public"."MlaProject" to "anon";

grant truncate on table "public"."MlaProject" to "anon";

grant update on table "public"."MlaProject" to "anon";

grant delete on table "public"."MlaProject" to "authenticated";

grant insert on table "public"."MlaProject" to "authenticated";

grant references on table "public"."MlaProject" to "authenticated";

grant select on table "public"."MlaProject" to "authenticated";

grant trigger on table "public"."MlaProject" to "authenticated";

grant truncate on table "public"."MlaProject" to "authenticated";

grant update on table "public"."MlaProject" to "authenticated";

grant delete on table "public"."MlaProject" to "service_role";

grant insert on table "public"."MlaProject" to "service_role";

grant references on table "public"."MlaProject" to "service_role";

grant select on table "public"."MlaProject" to "service_role";

grant trigger on table "public"."MlaProject" to "service_role";

grant truncate on table "public"."MlaProject" to "service_role";

grant update on table "public"."MlaProject" to "service_role";

grant delete on table "public"."PartNo" to "anon";

grant insert on table "public"."PartNo" to "anon";

grant references on table "public"."PartNo" to "anon";

grant select on table "public"."PartNo" to "anon";

grant trigger on table "public"."PartNo" to "anon";

grant truncate on table "public"."PartNo" to "anon";

grant update on table "public"."PartNo" to "anon";

grant delete on table "public"."PartNo" to "authenticated";

grant insert on table "public"."PartNo" to "authenticated";

grant references on table "public"."PartNo" to "authenticated";

grant select on table "public"."PartNo" to "authenticated";

grant trigger on table "public"."PartNo" to "authenticated";

grant truncate on table "public"."PartNo" to "authenticated";

grant update on table "public"."PartNo" to "authenticated";

grant delete on table "public"."PartNo" to "service_role";

grant insert on table "public"."PartNo" to "service_role";

grant references on table "public"."PartNo" to "service_role";

grant select on table "public"."PartNo" to "service_role";

grant trigger on table "public"."PartNo" to "service_role";

grant truncate on table "public"."PartNo" to "service_role";

grant update on table "public"."PartNo" to "service_role";

grant delete on table "public"."PhoneUpdateHistory" to "anon";

grant insert on table "public"."PhoneUpdateHistory" to "anon";

grant references on table "public"."PhoneUpdateHistory" to "anon";

grant select on table "public"."PhoneUpdateHistory" to "anon";

grant trigger on table "public"."PhoneUpdateHistory" to "anon";

grant truncate on table "public"."PhoneUpdateHistory" to "anon";

grant update on table "public"."PhoneUpdateHistory" to "anon";

grant delete on table "public"."PhoneUpdateHistory" to "authenticated";

grant insert on table "public"."PhoneUpdateHistory" to "authenticated";

grant references on table "public"."PhoneUpdateHistory" to "authenticated";

grant select on table "public"."PhoneUpdateHistory" to "authenticated";

grant trigger on table "public"."PhoneUpdateHistory" to "authenticated";

grant truncate on table "public"."PhoneUpdateHistory" to "authenticated";

grant update on table "public"."PhoneUpdateHistory" to "authenticated";

grant delete on table "public"."PhoneUpdateHistory" to "service_role";

grant insert on table "public"."PhoneUpdateHistory" to "service_role";

grant references on table "public"."PhoneUpdateHistory" to "service_role";

grant select on table "public"."PhoneUpdateHistory" to "service_role";

grant trigger on table "public"."PhoneUpdateHistory" to "service_role";

grant truncate on table "public"."PhoneUpdateHistory" to "service_role";

grant update on table "public"."PhoneUpdateHistory" to "service_role";

grant delete on table "public"."ProjectAttachment" to "anon";

grant insert on table "public"."ProjectAttachment" to "anon";

grant references on table "public"."ProjectAttachment" to "anon";

grant select on table "public"."ProjectAttachment" to "anon";

grant trigger on table "public"."ProjectAttachment" to "anon";

grant truncate on table "public"."ProjectAttachment" to "anon";

grant update on table "public"."ProjectAttachment" to "anon";

grant delete on table "public"."ProjectAttachment" to "authenticated";

grant insert on table "public"."ProjectAttachment" to "authenticated";

grant references on table "public"."ProjectAttachment" to "authenticated";

grant select on table "public"."ProjectAttachment" to "authenticated";

grant trigger on table "public"."ProjectAttachment" to "authenticated";

grant truncate on table "public"."ProjectAttachment" to "authenticated";

grant update on table "public"."ProjectAttachment" to "authenticated";

grant delete on table "public"."ProjectAttachment" to "service_role";

grant insert on table "public"."ProjectAttachment" to "service_role";

grant references on table "public"."ProjectAttachment" to "service_role";

grant select on table "public"."ProjectAttachment" to "service_role";

grant trigger on table "public"."ProjectAttachment" to "service_role";

grant truncate on table "public"."ProjectAttachment" to "service_role";

grant update on table "public"."ProjectAttachment" to "service_role";

grant delete on table "public"."RegisterAttachment" to "anon";

grant insert on table "public"."RegisterAttachment" to "anon";

grant references on table "public"."RegisterAttachment" to "anon";

grant select on table "public"."RegisterAttachment" to "anon";

grant trigger on table "public"."RegisterAttachment" to "anon";

grant truncate on table "public"."RegisterAttachment" to "anon";

grant update on table "public"."RegisterAttachment" to "anon";

grant delete on table "public"."RegisterAttachment" to "authenticated";

grant insert on table "public"."RegisterAttachment" to "authenticated";

grant references on table "public"."RegisterAttachment" to "authenticated";

grant select on table "public"."RegisterAttachment" to "authenticated";

grant trigger on table "public"."RegisterAttachment" to "authenticated";

grant truncate on table "public"."RegisterAttachment" to "authenticated";

grant update on table "public"."RegisterAttachment" to "authenticated";

grant delete on table "public"."RegisterAttachment" to "service_role";

grant insert on table "public"."RegisterAttachment" to "service_role";

grant references on table "public"."RegisterAttachment" to "service_role";

grant select on table "public"."RegisterAttachment" to "service_role";

grant trigger on table "public"."RegisterAttachment" to "service_role";

grant truncate on table "public"."RegisterAttachment" to "service_role";

grant update on table "public"."RegisterAttachment" to "service_role";

grant delete on table "public"."RegisterEntry" to "anon";

grant insert on table "public"."RegisterEntry" to "anon";

grant references on table "public"."RegisterEntry" to "anon";

grant select on table "public"."RegisterEntry" to "anon";

grant trigger on table "public"."RegisterEntry" to "anon";

grant truncate on table "public"."RegisterEntry" to "anon";

grant update on table "public"."RegisterEntry" to "anon";

grant delete on table "public"."RegisterEntry" to "authenticated";

grant insert on table "public"."RegisterEntry" to "authenticated";

grant references on table "public"."RegisterEntry" to "authenticated";

grant select on table "public"."RegisterEntry" to "authenticated";

grant trigger on table "public"."RegisterEntry" to "authenticated";

grant truncate on table "public"."RegisterEntry" to "authenticated";

grant update on table "public"."RegisterEntry" to "authenticated";

grant delete on table "public"."RegisterEntry" to "service_role";

grant insert on table "public"."RegisterEntry" to "service_role";

grant references on table "public"."RegisterEntry" to "service_role";

grant select on table "public"."RegisterEntry" to "service_role";

grant trigger on table "public"."RegisterEntry" to "service_role";

grant truncate on table "public"."RegisterEntry" to "service_role";

grant update on table "public"."RegisterEntry" to "service_role";

grant delete on table "public"."Role" to "anon";

grant insert on table "public"."Role" to "anon";

grant references on table "public"."Role" to "anon";

grant select on table "public"."Role" to "anon";

grant trigger on table "public"."Role" to "anon";

grant truncate on table "public"."Role" to "anon";

grant update on table "public"."Role" to "anon";

grant delete on table "public"."Role" to "authenticated";

grant insert on table "public"."Role" to "authenticated";

grant references on table "public"."Role" to "authenticated";

grant select on table "public"."Role" to "authenticated";

grant trigger on table "public"."Role" to "authenticated";

grant truncate on table "public"."Role" to "authenticated";

grant update on table "public"."Role" to "authenticated";

grant delete on table "public"."Role" to "service_role";

grant insert on table "public"."Role" to "service_role";

grant references on table "public"."Role" to "service_role";

grant select on table "public"."Role" to "service_role";

grant trigger on table "public"."Role" to "service_role";

grant truncate on table "public"."Role" to "service_role";

grant update on table "public"."Role" to "service_role";

grant delete on table "public"."RoleModulePermissions" to "anon";

grant insert on table "public"."RoleModulePermissions" to "anon";

grant references on table "public"."RoleModulePermissions" to "anon";

grant select on table "public"."RoleModulePermissions" to "anon";

grant trigger on table "public"."RoleModulePermissions" to "anon";

grant truncate on table "public"."RoleModulePermissions" to "anon";

grant update on table "public"."RoleModulePermissions" to "anon";

grant delete on table "public"."RoleModulePermissions" to "authenticated";

grant insert on table "public"."RoleModulePermissions" to "authenticated";

grant references on table "public"."RoleModulePermissions" to "authenticated";

grant select on table "public"."RoleModulePermissions" to "authenticated";

grant trigger on table "public"."RoleModulePermissions" to "authenticated";

grant truncate on table "public"."RoleModulePermissions" to "authenticated";

grant update on table "public"."RoleModulePermissions" to "authenticated";

grant delete on table "public"."RoleModulePermissions" to "service_role";

grant insert on table "public"."RoleModulePermissions" to "service_role";

grant references on table "public"."RoleModulePermissions" to "service_role";

grant select on table "public"."RoleModulePermissions" to "service_role";

grant trigger on table "public"."RoleModulePermissions" to "service_role";

grant truncate on table "public"."RoleModulePermissions" to "service_role";

grant update on table "public"."RoleModulePermissions" to "service_role";

grant delete on table "public"."Stream" to "anon";

grant insert on table "public"."Stream" to "anon";

grant references on table "public"."Stream" to "anon";

grant select on table "public"."Stream" to "anon";

grant trigger on table "public"."Stream" to "anon";

grant truncate on table "public"."Stream" to "anon";

grant update on table "public"."Stream" to "anon";

grant delete on table "public"."Stream" to "authenticated";

grant insert on table "public"."Stream" to "authenticated";

grant references on table "public"."Stream" to "authenticated";

grant select on table "public"."Stream" to "authenticated";

grant trigger on table "public"."Stream" to "authenticated";

grant truncate on table "public"."Stream" to "authenticated";

grant update on table "public"."Stream" to "authenticated";

grant delete on table "public"."Stream" to "service_role";

grant insert on table "public"."Stream" to "service_role";

grant references on table "public"."Stream" to "service_role";

grant select on table "public"."Stream" to "service_role";

grant trigger on table "public"."Stream" to "service_role";

grant truncate on table "public"."Stream" to "service_role";

grant update on table "public"."Stream" to "service_role";

grant delete on table "public"."Suggestion" to "anon";

grant insert on table "public"."Suggestion" to "anon";

grant references on table "public"."Suggestion" to "anon";

grant select on table "public"."Suggestion" to "anon";

grant trigger on table "public"."Suggestion" to "anon";

grant truncate on table "public"."Suggestion" to "anon";

grant update on table "public"."Suggestion" to "anon";

grant delete on table "public"."Suggestion" to "authenticated";

grant insert on table "public"."Suggestion" to "authenticated";

grant references on table "public"."Suggestion" to "authenticated";

grant select on table "public"."Suggestion" to "authenticated";

grant trigger on table "public"."Suggestion" to "authenticated";

grant truncate on table "public"."Suggestion" to "authenticated";

grant update on table "public"."Suggestion" to "authenticated";

grant delete on table "public"."Suggestion" to "service_role";

grant insert on table "public"."Suggestion" to "service_role";

grant references on table "public"."Suggestion" to "service_role";

grant select on table "public"."Suggestion" to "service_role";

grant trigger on table "public"."Suggestion" to "service_role";

grant truncate on table "public"."Suggestion" to "service_role";

grant update on table "public"."Suggestion" to "service_role";

grant delete on table "public"."TaskHistory" to "anon";

grant insert on table "public"."TaskHistory" to "anon";

grant references on table "public"."TaskHistory" to "anon";

grant select on table "public"."TaskHistory" to "anon";

grant trigger on table "public"."TaskHistory" to "anon";

grant truncate on table "public"."TaskHistory" to "anon";

grant update on table "public"."TaskHistory" to "anon";

grant delete on table "public"."TaskHistory" to "authenticated";

grant insert on table "public"."TaskHistory" to "authenticated";

grant references on table "public"."TaskHistory" to "authenticated";

grant select on table "public"."TaskHistory" to "authenticated";

grant trigger on table "public"."TaskHistory" to "authenticated";

grant truncate on table "public"."TaskHistory" to "authenticated";

grant update on table "public"."TaskHistory" to "authenticated";

grant delete on table "public"."TaskHistory" to "service_role";

grant insert on table "public"."TaskHistory" to "service_role";

grant references on table "public"."TaskHistory" to "service_role";

grant select on table "public"."TaskHistory" to "service_role";

grant trigger on table "public"."TaskHistory" to "service_role";

grant truncate on table "public"."TaskHistory" to "service_role";

grant update on table "public"."TaskHistory" to "service_role";

grant delete on table "public"."User" to "anon";

grant insert on table "public"."User" to "anon";

grant references on table "public"."User" to "anon";

grant select on table "public"."User" to "anon";

grant trigger on table "public"."User" to "anon";

grant truncate on table "public"."User" to "anon";

grant update on table "public"."User" to "anon";

grant delete on table "public"."User" to "authenticated";

grant insert on table "public"."User" to "authenticated";

grant references on table "public"."User" to "authenticated";

grant select on table "public"."User" to "authenticated";

grant trigger on table "public"."User" to "authenticated";

grant truncate on table "public"."User" to "authenticated";

grant update on table "public"."User" to "authenticated";

grant delete on table "public"."User" to "service_role";

grant insert on table "public"."User" to "service_role";

grant references on table "public"."User" to "service_role";

grant select on table "public"."User" to "service_role";

grant trigger on table "public"."User" to "service_role";

grant truncate on table "public"."User" to "service_role";

grant update on table "public"."User" to "service_role";

grant delete on table "public"."UserModulePermissions" to "anon";

grant insert on table "public"."UserModulePermissions" to "anon";

grant references on table "public"."UserModulePermissions" to "anon";

grant select on table "public"."UserModulePermissions" to "anon";

grant trigger on table "public"."UserModulePermissions" to "anon";

grant truncate on table "public"."UserModulePermissions" to "anon";

grant update on table "public"."UserModulePermissions" to "anon";

grant delete on table "public"."UserModulePermissions" to "authenticated";

grant insert on table "public"."UserModulePermissions" to "authenticated";

grant references on table "public"."UserModulePermissions" to "authenticated";

grant select on table "public"."UserModulePermissions" to "authenticated";

grant trigger on table "public"."UserModulePermissions" to "authenticated";

grant truncate on table "public"."UserModulePermissions" to "authenticated";

grant update on table "public"."UserModulePermissions" to "authenticated";

grant delete on table "public"."UserModulePermissions" to "service_role";

grant insert on table "public"."UserModulePermissions" to "service_role";

grant references on table "public"."UserModulePermissions" to "service_role";

grant select on table "public"."UserModulePermissions" to "service_role";

grant trigger on table "public"."UserModulePermissions" to "service_role";

grant truncate on table "public"."UserModulePermissions" to "service_role";

grant update on table "public"."UserModulePermissions" to "service_role";

grant delete on table "public"."UserPartAssignment" to "anon";

grant insert on table "public"."UserPartAssignment" to "anon";

grant references on table "public"."UserPartAssignment" to "anon";

grant select on table "public"."UserPartAssignment" to "anon";

grant trigger on table "public"."UserPartAssignment" to "anon";

grant truncate on table "public"."UserPartAssignment" to "anon";

grant update on table "public"."UserPartAssignment" to "anon";

grant delete on table "public"."UserPartAssignment" to "authenticated";

grant insert on table "public"."UserPartAssignment" to "authenticated";

grant references on table "public"."UserPartAssignment" to "authenticated";

grant select on table "public"."UserPartAssignment" to "authenticated";

grant trigger on table "public"."UserPartAssignment" to "authenticated";

grant truncate on table "public"."UserPartAssignment" to "authenticated";

grant update on table "public"."UserPartAssignment" to "authenticated";

grant delete on table "public"."UserPartAssignment" to "service_role";

grant insert on table "public"."UserPartAssignment" to "service_role";

grant references on table "public"."UserPartAssignment" to "service_role";

grant select on table "public"."UserPartAssignment" to "service_role";

grant trigger on table "public"."UserPartAssignment" to "service_role";

grant truncate on table "public"."UserPartAssignment" to "service_role";

grant update on table "public"."UserPartAssignment" to "service_role";

grant delete on table "public"."Visitor" to "anon";

grant insert on table "public"."Visitor" to "anon";

grant references on table "public"."Visitor" to "anon";

grant select on table "public"."Visitor" to "anon";

grant trigger on table "public"."Visitor" to "anon";

grant truncate on table "public"."Visitor" to "anon";

grant update on table "public"."Visitor" to "anon";

grant delete on table "public"."Visitor" to "authenticated";

grant insert on table "public"."Visitor" to "authenticated";

grant references on table "public"."Visitor" to "authenticated";

grant select on table "public"."Visitor" to "authenticated";

grant trigger on table "public"."Visitor" to "authenticated";

grant truncate on table "public"."Visitor" to "authenticated";

grant update on table "public"."Visitor" to "authenticated";

grant delete on table "public"."Visitor" to "service_role";

grant insert on table "public"."Visitor" to "service_role";

grant references on table "public"."Visitor" to "service_role";

grant select on table "public"."Visitor" to "service_role";

grant trigger on table "public"."Visitor" to "service_role";

grant truncate on table "public"."Visitor" to "service_role";

grant update on table "public"."Visitor" to "service_role";

grant delete on table "public"."Vote" to "anon";

grant insert on table "public"."Vote" to "anon";

grant references on table "public"."Vote" to "anon";

grant select on table "public"."Vote" to "anon";

grant trigger on table "public"."Vote" to "anon";

grant truncate on table "public"."Vote" to "anon";

grant update on table "public"."Vote" to "anon";

grant delete on table "public"."Vote" to "authenticated";

grant insert on table "public"."Vote" to "authenticated";

grant references on table "public"."Vote" to "authenticated";

grant select on table "public"."Vote" to "authenticated";

grant trigger on table "public"."Vote" to "authenticated";

grant truncate on table "public"."Vote" to "authenticated";

grant update on table "public"."Vote" to "authenticated";

grant delete on table "public"."Vote" to "service_role";

grant insert on table "public"."Vote" to "service_role";

grant references on table "public"."Vote" to "service_role";

grant select on table "public"."Vote" to "service_role";

grant trigger on table "public"."Vote" to "service_role";

grant truncate on table "public"."Vote" to "service_role";

grant update on table "public"."Vote" to "service_role";

grant delete on table "public"."Vote_v2" to "anon";

grant insert on table "public"."Vote_v2" to "anon";

grant references on table "public"."Vote_v2" to "anon";

grant select on table "public"."Vote_v2" to "anon";

grant trigger on table "public"."Vote_v2" to "anon";

grant truncate on table "public"."Vote_v2" to "anon";

grant update on table "public"."Vote_v2" to "anon";

grant delete on table "public"."Vote_v2" to "authenticated";

grant insert on table "public"."Vote_v2" to "authenticated";

grant references on table "public"."Vote_v2" to "authenticated";

grant select on table "public"."Vote_v2" to "authenticated";

grant trigger on table "public"."Vote_v2" to "authenticated";

grant truncate on table "public"."Vote_v2" to "authenticated";

grant update on table "public"."Vote_v2" to "authenticated";

grant delete on table "public"."Vote_v2" to "service_role";

grant insert on table "public"."Vote_v2" to "service_role";

grant references on table "public"."Vote_v2" to "service_role";

grant select on table "public"."Vote_v2" to "service_role";

grant trigger on table "public"."Vote_v2" to "service_role";

grant truncate on table "public"."Vote_v2" to "service_role";

grant update on table "public"."Vote_v2" to "service_role";

grant delete on table "public"."VoterMaster" to "anon";

grant insert on table "public"."VoterMaster" to "anon";

grant references on table "public"."VoterMaster" to "anon";

grant select on table "public"."VoterMaster" to "anon";

grant trigger on table "public"."VoterMaster" to "anon";

grant truncate on table "public"."VoterMaster" to "anon";

grant update on table "public"."VoterMaster" to "anon";

grant delete on table "public"."VoterMaster" to "authenticated";

grant insert on table "public"."VoterMaster" to "authenticated";

grant references on table "public"."VoterMaster" to "authenticated";

grant select on table "public"."VoterMaster" to "authenticated";

grant trigger on table "public"."VoterMaster" to "authenticated";

grant truncate on table "public"."VoterMaster" to "authenticated";

grant update on table "public"."VoterMaster" to "authenticated";

grant delete on table "public"."VoterMaster" to "service_role";

grant insert on table "public"."VoterMaster" to "service_role";

grant references on table "public"."VoterMaster" to "service_role";

grant select on table "public"."VoterMaster" to "service_role";

grant trigger on table "public"."VoterMaster" to "service_role";

grant truncate on table "public"."VoterMaster" to "service_role";

grant update on table "public"."VoterMaster" to "service_role";

grant delete on table "public"."VoterMobileNumber" to "anon";

grant insert on table "public"."VoterMobileNumber" to "anon";

grant references on table "public"."VoterMobileNumber" to "anon";

grant select on table "public"."VoterMobileNumber" to "anon";

grant trigger on table "public"."VoterMobileNumber" to "anon";

grant truncate on table "public"."VoterMobileNumber" to "anon";

grant update on table "public"."VoterMobileNumber" to "anon";

grant delete on table "public"."VoterMobileNumber" to "authenticated";

grant insert on table "public"."VoterMobileNumber" to "authenticated";

grant references on table "public"."VoterMobileNumber" to "authenticated";

grant select on table "public"."VoterMobileNumber" to "authenticated";

grant trigger on table "public"."VoterMobileNumber" to "authenticated";

grant truncate on table "public"."VoterMobileNumber" to "authenticated";

grant update on table "public"."VoterMobileNumber" to "authenticated";

grant delete on table "public"."VoterMobileNumber" to "service_role";

grant insert on table "public"."VoterMobileNumber" to "service_role";

grant references on table "public"."VoterMobileNumber" to "service_role";

grant select on table "public"."VoterMobileNumber" to "service_role";

grant trigger on table "public"."VoterMobileNumber" to "service_role";

grant truncate on table "public"."VoterMobileNumber" to "service_role";

grant update on table "public"."VoterMobileNumber" to "service_role";

grant delete on table "public"."VoterProfile" to "anon";

grant insert on table "public"."VoterProfile" to "anon";

grant references on table "public"."VoterProfile" to "anon";

grant select on table "public"."VoterProfile" to "anon";

grant trigger on table "public"."VoterProfile" to "anon";

grant truncate on table "public"."VoterProfile" to "anon";

grant update on table "public"."VoterProfile" to "anon";

grant delete on table "public"."VoterProfile" to "authenticated";

grant insert on table "public"."VoterProfile" to "authenticated";

grant references on table "public"."VoterProfile" to "authenticated";

grant select on table "public"."VoterProfile" to "authenticated";

grant trigger on table "public"."VoterProfile" to "authenticated";

grant truncate on table "public"."VoterProfile" to "authenticated";

grant update on table "public"."VoterProfile" to "authenticated";

grant delete on table "public"."VoterProfile" to "service_role";

grant insert on table "public"."VoterProfile" to "service_role";

grant references on table "public"."VoterProfile" to "service_role";

grant select on table "public"."VoterProfile" to "service_role";

grant trigger on table "public"."VoterProfile" to "service_role";

grant truncate on table "public"."VoterProfile" to "service_role";

grant update on table "public"."VoterProfile" to "service_role";

grant delete on table "public"."VoterTask" to "anon";

grant insert on table "public"."VoterTask" to "anon";

grant references on table "public"."VoterTask" to "anon";

grant select on table "public"."VoterTask" to "anon";

grant trigger on table "public"."VoterTask" to "anon";

grant truncate on table "public"."VoterTask" to "anon";

grant update on table "public"."VoterTask" to "anon";

grant delete on table "public"."VoterTask" to "authenticated";

grant insert on table "public"."VoterTask" to "authenticated";

grant references on table "public"."VoterTask" to "authenticated";

grant select on table "public"."VoterTask" to "authenticated";

grant trigger on table "public"."VoterTask" to "authenticated";

grant truncate on table "public"."VoterTask" to "authenticated";

grant update on table "public"."VoterTask" to "authenticated";

grant delete on table "public"."VoterTask" to "service_role";

grant insert on table "public"."VoterTask" to "service_role";

grant references on table "public"."VoterTask" to "service_role";

grant select on table "public"."VoterTask" to "service_role";

grant trigger on table "public"."VoterTask" to "service_role";

grant truncate on table "public"."VoterTask" to "service_role";

grant update on table "public"."VoterTask" to "service_role";

CREATE TRIGGER sync_service_status_on_task_change AFTER INSERT OR DELETE OR UPDATE OF status ON public."VoterTask" FOR EACH ROW EXECUTE FUNCTION public.sync_beneficiary_service_status();


