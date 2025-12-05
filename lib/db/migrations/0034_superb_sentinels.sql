-- Create PartNo table
CREATE TABLE IF NOT EXISTS "PartNo" (
	"part_no" varchar(10) PRIMARY KEY NOT NULL,
	"ward_no" varchar(10),
	"booth_name" varchar(255),
	"english_booth_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Populate PartNo table with unique part_no values from Voter table
-- Using DISTINCT ON to get one record per part_no
INSERT INTO "PartNo" ("part_no", "ward_no", "booth_name", "english_booth_address", "created_at", "updated_at")
SELECT DISTINCT ON ("part_no")
	"part_no",
	"ward_no",
	"booth_name",
	"english_booth_address",
	now(),
	now()
FROM "Voter"
WHERE "part_no" IS NOT NULL
ORDER BY "part_no", "epic_number"
ON CONFLICT ("part_no") DO NOTHING;
--> statement-breakpoint
-- Add foreign key constraint
DO $$ BEGIN
 ALTER TABLE "Voter" ADD CONSTRAINT "Voter_part_no_PartNo_part_no_fk" FOREIGN KEY ("part_no") REFERENCES "public"."PartNo"("part_no") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
-- Remove old columns from Voter table
ALTER TABLE "Voter" DROP COLUMN IF EXISTS "ward_no";--> statement-breakpoint
ALTER TABLE "Voter" DROP COLUMN IF EXISTS "booth_name";--> statement-breakpoint
ALTER TABLE "Voter" DROP COLUMN IF EXISTS "english_booth_address";