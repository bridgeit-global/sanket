-- Create UserModulePermissions table
CREATE TABLE IF NOT EXISTS "UserModulePermissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"module_key" varchar(50) NOT NULL,
	"has_access" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Create DailyProgramme table
CREATE TABLE IF NOT EXISTS "DailyProgramme" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"start_time" varchar(10) NOT NULL,
	"end_time" varchar(10),
	"title" varchar(255) NOT NULL,
	"location" varchar(255) NOT NULL,
	"remarks" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Create MlaProject table
CREATE TABLE IF NOT EXISTS "MlaProject" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"ward" varchar(100),
	"type" varchar(100),
	"status" varchar DEFAULT 'Concept' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Create RegisterEntry table
CREATE TABLE IF NOT EXISTS "RegisterEntry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar NOT NULL,
	"date" date NOT NULL,
	"from_to" varchar(255) NOT NULL,
	"subject" varchar(500) NOT NULL,
	"project_id" uuid,
	"mode" varchar(100),
	"ref_no" varchar(100),
	"officer" varchar(255),
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Create RegisterAttachment table
CREATE TABLE IF NOT EXISTS "RegisterAttachment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_size_kb" integer NOT NULL,
	"file_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "UserModulePermissions" ADD CONSTRAINT "UserModulePermissions_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "DailyProgramme" ADD CONSTRAINT "DailyProgramme_created_by_User_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "MlaProject" ADD CONSTRAINT "MlaProject_created_by_User_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "RegisterEntry" ADD CONSTRAINT "RegisterEntry_created_by_User_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "RegisterEntry" ADD CONSTRAINT "RegisterEntry_project_id_MlaProject_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."MlaProject"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "RegisterAttachment" ADD CONSTRAINT "RegisterAttachment_entry_id_RegisterEntry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."RegisterEntry"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_user_module_permissions_user_id" ON "UserModulePermissions" ("userId");
CREATE INDEX IF NOT EXISTS "idx_user_module_permissions_module_key" ON "UserModulePermissions" ("module_key");
CREATE INDEX IF NOT EXISTS "idx_user_module_permissions_user_module" ON "UserModulePermissions" ("userId", "module_key");
CREATE INDEX IF NOT EXISTS "idx_daily_programme_date" ON "DailyProgramme" ("date");
CREATE INDEX IF NOT EXISTS "idx_daily_programme_created_by" ON "DailyProgramme" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_register_entry_type" ON "RegisterEntry" ("type");
CREATE INDEX IF NOT EXISTS "idx_register_entry_date" ON "RegisterEntry" ("date");
CREATE INDEX IF NOT EXISTS "idx_register_entry_created_by" ON "RegisterEntry" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_mla_project_status" ON "MlaProject" ("status");
CREATE INDEX IF NOT EXISTS "idx_register_attachment_entry_id" ON "RegisterAttachment" ("entry_id");

