CREATE TABLE IF NOT EXISTS "BoothMaster" (
	"election_id" varchar(50) NOT NULL,
	"booth_no" varchar(10) NOT NULL,
	"ac_no" varchar(10),
	"ward_no" varchar(10),
	"constituency_type" varchar CHECK ("constituency_type" IN ('ward', 'assembly', 'parliament')),
	"constituency_id" varchar(50),
	"booth_name" varchar(255),
	"booth_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "BoothMaster_election_id_booth_no_pk" PRIMARY KEY("election_id","booth_no")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ElectionMaster" (
	"election_id" varchar(50) PRIMARY KEY NOT NULL,
	"election_type" varchar(50) NOT NULL,
	"year" integer NOT NULL,
	"delimitation_version" varchar(50),
	"data_source" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
-- Add constituency_type and constituency_id columns to ElectionMapping
ALTER TABLE "ElectionMapping" ADD COLUMN IF NOT EXISTS "constituency_type" varchar CHECK ("constituency_type" IN ('ward', 'assembly', 'parliament'));
ALTER TABLE "ElectionMapping" ADD COLUMN IF NOT EXISTS "constituency_id" varchar(50);
--> statement-breakpoint


-- Migrate election data to ElectionMaster
INSERT INTO "ElectionMaster" ("election_id", "election_type", "year", "delimitation_version", "data_source", "created_at", "updated_at")
SELECT DISTINCT 
	"election_id",
	"election_type",
	"year",
	"delimitation_version",
	"data_source",
	MIN("created_at") as "created_at",
	MAX("updated_at") as "updated_at"
FROM "ElectionMapping"
GROUP BY "election_id", "election_type", "year", "delimitation_version", "data_source"
ON CONFLICT ("election_id") DO NOTHING;
--> statement-breakpoint

-- Migrate booth data to BoothMaster
INSERT INTO "BoothMaster" ("election_id", "booth_no", "ac_no", "ward_no", "constituency_type", "constituency_id", "booth_name", "booth_address", "created_at", "updated_at")
SELECT DISTINCT
	em."election_id",
	em."booth_no",
	em."ac_no",
	em."ward_no",
	CASE 
		WHEN em."election_type" = 'Local' THEN 'ward'
		WHEN em."election_type" = 'Assembly' THEN 'assembly'
		WHEN em."election_type" = 'General' THEN 'parliament'
		ELSE NULL
	END as "constituency_type",
	CASE 
		WHEN em."election_type" = 'Local' THEN em."ward_no"
		WHEN em."election_type" = 'Assembly' THEN em."ac_no"
		WHEN em."election_type" = 'General' THEN em."ac_no"
		ELSE NULL
	END as "constituency_id",
	em."booth_name",
	em."booth_address",
	MIN(em."created_at") as "created_at",
	MAX(em."updated_at") as "updated_at"
FROM "ElectionMapping" em
WHERE em."booth_no" IS NOT NULL
GROUP BY em."election_id", em."booth_no", em."ac_no", em."ward_no", em."booth_name", em."booth_address", em."election_type"
ON CONFLICT ("election_id", "booth_no") DO NOTHING;
--> statement-breakpoint

-- Populate constituency fields in ElectionMapping
UPDATE "ElectionMapping" em
SET 
	"constituency_type" = CASE 
		WHEN em."election_type" = 'Local' THEN 'ward'
		WHEN em."election_type" = 'Assembly' THEN 'assembly'
		WHEN em."election_type" = 'General' THEN 'parliament'
		ELSE NULL
	END,
	"constituency_id" = CASE 
		WHEN em."election_type" = 'Local' THEN em."ward_no"
		WHEN em."election_type" = 'Assembly' THEN em."ac_no"
		WHEN em."election_type" = 'General' THEN em."ac_no"
		ELSE NULL
	END;
--> statement-breakpoint

-- Create indexes for BoothMaster
CREATE INDEX IF NOT EXISTS "idx_booth_master_election_id" ON "BoothMaster"("election_id");
CREATE INDEX IF NOT EXISTS "idx_booth_master_constituency_id" ON "BoothMaster"("constituency_id");
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "BoothMaster" ADD CONSTRAINT "BoothMaster_election_id_ElectionMaster_election_id_fk" FOREIGN KEY ("election_id") REFERENCES "public"."ElectionMaster"("election_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_booth_master_election_id" ON "BoothMaster" USING btree ("election_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_booth_master_constituency_id" ON "BoothMaster" USING btree ("constituency_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ElectionMapping" ADD CONSTRAINT "ElectionMapping_election_id_ElectionMaster_election_id_fk" FOREIGN KEY ("election_id") REFERENCES "public"."ElectionMaster"("election_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_election_mapping_constituency_id" ON "ElectionMapping" USING btree ("constituency_id");--> statement-breakpoint
ALTER TABLE "ElectionMapping" DROP COLUMN IF EXISTS "election_type";--> statement-breakpoint
ALTER TABLE "ElectionMapping" DROP COLUMN IF EXISTS "year";--> statement-breakpoint
ALTER TABLE "ElectionMapping" DROP COLUMN IF EXISTS "ac_no";--> statement-breakpoint
ALTER TABLE "ElectionMapping" DROP COLUMN IF EXISTS "ward_no";--> statement-breakpoint
ALTER TABLE "ElectionMapping" DROP COLUMN IF EXISTS "booth_name";--> statement-breakpoint
ALTER TABLE "ElectionMapping" DROP COLUMN IF EXISTS "booth_address";--> statement-breakpoint
ALTER TABLE "ElectionMapping" DROP COLUMN IF EXISTS "delimitation_version";--> statement-breakpoint
ALTER TABLE "ElectionMapping" DROP COLUMN IF EXISTS "data_source";