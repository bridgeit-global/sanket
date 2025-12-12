-- Add created_by and updated_by columns to VoterTask table
ALTER TABLE "VoterTask" ADD COLUMN IF NOT EXISTS "created_by" uuid;
ALTER TABLE "VoterTask" ADD COLUMN IF NOT EXISTS "updated_by" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "VoterTask" ADD CONSTRAINT "VoterTask_created_by_User_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "VoterTask" ADD CONSTRAINT "VoterTask_updated_by_User_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Add updated_by column to DailyProgramme table
ALTER TABLE "DailyProgramme" ADD COLUMN IF NOT EXISTS "updated_by" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "DailyProgramme" ADD CONSTRAINT "DailyProgramme_updated_by_User_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "voter_task_created_by_idx" ON "VoterTask"("created_by");
CREATE INDEX IF NOT EXISTS "voter_task_updated_by_idx" ON "VoterTask"("updated_by");
CREATE INDEX IF NOT EXISTS "daily_programme_updated_by_idx" ON "DailyProgramme"("updated_by");
--> statement-breakpoint

-- Backfill existing records: set created_by to assignedTo if available, otherwise leave null
-- Note: This assumes assignedTo exists. If not, created_by will remain null for existing records
UPDATE "VoterTask" 
SET "created_by" = "assigned_to" 
WHERE "created_by" IS NULL AND "assigned_to" IS NOT NULL;
--> statement-breakpoint

