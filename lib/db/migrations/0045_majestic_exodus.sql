CREATE TABLE IF NOT EXISTS "DailyProgrammeAttachment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"programme_id" uuid NOT NULL REFERENCES "DailyProgramme"("id") ON DELETE CASCADE,
	"file_name" varchar(255) NOT NULL,
	"file_size_kb" integer NOT NULL,
	"file_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Add index for faster lookups by programme_id
CREATE INDEX IF NOT EXISTS "daily_programme_attachment_programme_id_idx" ON "DailyProgrammeAttachment"("programme_id");

