-- Add ProjectAttachment table for storing documents related to projects
CREATE TABLE IF NOT EXISTS "ProjectAttachment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_size_kb" integer NOT NULL,
	"file_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ProjectAttachment_project_id_MlaProject_id_fk" FOREIGN KEY ("project_id") REFERENCES "MlaProject"("id") ON DELETE cascade ON UPDATE no action
);
