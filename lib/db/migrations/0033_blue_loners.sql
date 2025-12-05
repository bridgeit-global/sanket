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
CREATE TABLE IF NOT EXISTS "ExportJob" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(50) NOT NULL,
	"format" varchar(10) NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"total_records" integer DEFAULT 0,
	"processed_records" integer DEFAULT 0,
	"file_url" text,
	"file_name" varchar(255),
	"file_size_kb" integer,
	"filters" json,
	"error_message" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
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
CREATE TABLE IF NOT EXISTS "ProjectAttachment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_size_kb" integer NOT NULL,
	"file_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "RegisterAttachment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_size_kb" integer NOT NULL,
	"file_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE IF NOT EXISTS "Role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Role_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "RoleModulePermissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"module_key" varchar(50) NOT NULL,
	"has_access" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "RoleModulePermissions_role_id_module_key_unique" UNIQUE("role_id","module_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "UserModulePermissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"module_key" varchar(50) NOT NULL,
	"has_access" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Visitor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"contact_number" varchar(20) NOT NULL,
	"purpose" text NOT NULL,
	"programme_event_id" uuid,
	"visit_date" timestamp NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Voter" ADD COLUMN IF NOT EXISTS "address" text;--> statement-breakpoint
ALTER TABLE "Voter" ADD COLUMN IF NOT EXISTS "pincode" varchar(10);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "user_id" varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role_id" uuid;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "metadata" json;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "DailyProgramme" ADD CONSTRAINT "DailyProgramme_created_by_User_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_created_by_User_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
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
 ALTER TABLE "ProjectAttachment" ADD CONSTRAINT "ProjectAttachment_project_id_MlaProject_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."MlaProject"("id") ON DELETE cascade ON UPDATE no action;
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
DO $$ BEGIN
 ALTER TABLE "RegisterEntry" ADD CONSTRAINT "RegisterEntry_project_id_MlaProject_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."MlaProject"("id") ON DELETE no action ON UPDATE no action;
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
 ALTER TABLE "RoleModulePermissions" ADD CONSTRAINT "RoleModulePermissions_role_id_Role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."Role"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserModulePermissions" ADD CONSTRAINT "UserModulePermissions_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_programme_event_id_DailyProgramme_id_fk" FOREIGN KEY ("programme_event_id") REFERENCES "public"."DailyProgramme"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_created_by_User_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "User" ADD CONSTRAINT "User_role_id_Role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."Role"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "User" DROP COLUMN IF EXISTS "email";--> statement-breakpoint
ALTER TABLE "User" DROP COLUMN IF EXISTS "role";--> statement-breakpoint
