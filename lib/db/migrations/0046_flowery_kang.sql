CREATE TABLE IF NOT EXISTS "VoterMaster" (
	"epic_number" varchar(20) PRIMARY KEY NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"relation_type" varchar(50),
	"relation_name" varchar(255),
	"family_grouping" varchar(100),
	"house_number" varchar(127),
	"religion" varchar(50),
	"age" integer,
	"dob" date,
	"gender" varchar(10),
	"mobile_no_primary" varchar(15),
	"mobile_no_secondary" varchar(15),
	"address" text,
	"pincode" varchar(10),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ElectionMapping" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"epic_number" varchar(20) NOT NULL REFERENCES "VoterMaster"("epic_number") ON DELETE CASCADE,
	"election_id" varchar(50) NOT NULL,
	"election_type" varchar(50) NOT NULL,
	"year" integer NOT NULL,
	"ac_no" varchar(10),
	"ward_no" varchar(10),
	"booth_no" varchar(10),
	"part_no" varchar(10),
	"sr_no" varchar(10),
	"booth_name" varchar(255),
	"booth_address" text,
	"delimitation_version" varchar(50),
	"data_source" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ElectionMapping_epic_number_election_id_unique" UNIQUE("epic_number","election_id")
);
--> statement-breakpoint

-- Create indexes for ElectionMapping
CREATE INDEX IF NOT EXISTS "idx_election_mapping_election_id" ON "ElectionMapping"("election_id");
CREATE INDEX IF NOT EXISTS "idx_election_mapping_epic_number" ON "ElectionMapping"("epic_number");

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "VotingHistory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"epic_number" varchar(20) NOT NULL REFERENCES "VoterMaster"("epic_number") ON DELETE CASCADE,
	"election_id" varchar(50) NOT NULL,
	"has_voted" boolean DEFAULT false NOT NULL,
	"marked_by" uuid,
	"marked_at" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "VotingHistory_epic_number_election_id_unique" UNIQUE("epic_number","election_id")
);

--> statement-breakpoint
-- Create indexes for VotingHistory
CREATE INDEX IF NOT EXISTS "idx_voting_history_election_id" ON "VotingHistory"("election_id");
CREATE INDEX IF NOT EXISTS "idx_voting_history_epic_number" ON "VotingHistory"("epic_number");

--> statement-breakpoint
ALTER TABLE "BeneficiaryService" DROP CONSTRAINT "BeneficiaryService_voter_id_Voter_epic_number_fk";
--> statement-breakpoint
ALTER TABLE "PhoneUpdateHistory" DROP CONSTRAINT "PhoneUpdateHistory_epic_number_Voter_epic_number_fk";
--> statement-breakpoint
ALTER TABLE "VoterMobileNumber" DROP CONSTRAINT "VoterMobileNumber_epic_number_Voter_epic_number_fk";
--> statement-breakpoint
ALTER TABLE "VoterTask" DROP CONSTRAINT "VoterTask_voter_id_Voter_epic_number_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ElectionMapping" ADD CONSTRAINT "ElectionMapping_epic_number_VoterMaster_epic_number_fk" FOREIGN KEY ("epic_number") REFERENCES "public"."VoterMaster"("epic_number") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "VotingHistory" ADD CONSTRAINT "VotingHistory_epic_number_VoterMaster_epic_number_fk" FOREIGN KEY ("epic_number") REFERENCES "public"."VoterMaster"("epic_number") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "VotingHistory" ADD CONSTRAINT "VotingHistory_marked_by_User_id_fk" FOREIGN KEY ("marked_by") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_election_mapping_election_id" ON "ElectionMapping" USING btree ("election_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_election_mapping_epic_number" ON "ElectionMapping" USING btree ("epic_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_voting_history_election_id" ON "VotingHistory" USING btree ("election_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_voting_history_epic_number" ON "VotingHistory" USING btree ("epic_number");--> statement-breakpoint


-- Step 4: Migrate data from Voter to VoterMaster
INSERT INTO "VoterMaster" (
  "epic_number",
  "full_name",
  "relation_type",
  "relation_name",
  "family_grouping",
  "house_number",
  "religion",
  "age",
  "dob",
  "gender",
  "address",
  "pincode"
)
SELECT 
  "epic_number",
  "full_name",
  "relation_type",
  "relation_name",
  "family_grouping",
  "house_number",
  "religion",
  "age",
  "dob",
  "gender",
  "address",
  "pincode"
FROM "Voter"
ON CONFLICT ("epic_number") DO NOTHING;

-- Step 5: Migrate election data to ElectionMapping
-- Default election ID: GE2024 (General Election 2024) - adjust as needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Voter'
      AND column_name = 'part_no'
  ) THEN
    INSERT INTO "ElectionMapping" (
      "epic_number",
      "election_id",
      "booth_no",
      "sr_no"
    )
    SELECT
      v."epic_number",
      'GE2024' as "election_id",
      v."part_no"::int as "booth_no", -- booth_no not in original table
      v."sr_no"::bigint
    FROM "Voter" v
    WHERE v."epic_number" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "ElectionMapping" em
        WHERE em."epic_number" = v."epic_number"
          AND em."election_id" = 'GE2024'
      );
  ELSE
    INSERT INTO "ElectionMapping" (
      "epic_number",
      "election_id",
      "booth_no",
      "sr_no"
    )
    SELECT
      v."epic_number",
      'GE2024' as "election_id",
      NULL::int as "booth_no",
      v."sr_no"::bigint
    FROM "Voter" v
    WHERE v."epic_number" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "ElectionMapping" em
        WHERE em."epic_number" = v."epic_number"
          AND em."election_id" = 'GE2024'
      );
  END IF;
END $$;

-- Step 6: Migrate voting status to VotingHistory
INSERT INTO "VotingHistory" (
  "epic_number",
  "election_id",
  "has_voted",
  "marked_at",
  "created_at",
  "updated_at"
)
SELECT 
  "epic_number",
  'GE2024' as "election_id",
  COALESCE("is_voted_2024", false) as "has_voted",
  "updated_at" as "marked_at",
  "created_at",
  "updated_at"
FROM "Voter"
WHERE "is_voted_2024" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "VotingHistory" vh
    WHERE vh."epic_number" = "Voter"."epic_number"
      AND vh."election_id" = 'GE2024'
  );

UPDATE "VotingHistory" vh
SET "has_voted" = COALESCE(v."is_voted_2024", false),
    "marked_at" = v."updated_at",
    "updated_at" = v."updated_at"
FROM "Voter" v
WHERE v."is_voted_2024" IS NOT NULL
  AND vh."epic_number" = v."epic_number"
  AND vh."election_id" = 'GE2024';


-- Step 7: Update foreign key constraints in dependent tables
-- Note: These will be handled by Drizzle schema, but we ensure data integrity here

-- VoterMobileNumber already references Voter.epicNumber
-- We'll need to update the constraint after ensuring all epic_numbers exist in VoterMaster
-- This is handled by the schema definition, but we verify data integrity:
DO $$
BEGIN
  -- Check if there are any orphaned records
  IF EXISTS (
    SELECT 1 FROM "VoterMobileNumber" vm
    LEFT JOIN "VoterMaster" vm2 ON vm."epic_number" = vm2."epic_number"
    WHERE vm2."epic_number" IS NULL
  ) THEN
    RAISE NOTICE 'Warning: Found orphaned VoterMobileNumber records';
  END IF;
END $$;

-- Similar checks for other tables
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "BeneficiaryService" bs
    LEFT JOIN "VoterMaster" vm ON bs."voter_id" = vm."epic_number"
    WHERE bs."voter_id" IS NOT NULL AND vm."epic_number" IS NULL
  ) THEN
    RAISE NOTICE 'Warning: Found orphaned BeneficiaryService records';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "VoterTask" vt
    LEFT JOIN "VoterMaster" vm ON vt."voter_id" = vm."epic_number"
    WHERE vm."epic_number" IS NULL
  ) THEN
    RAISE NOTICE 'Warning: Found orphaned VoterTask records';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "PhoneUpdateHistory" puh
    LEFT JOIN "VoterMaster" vm ON puh."epic_number" = vm."epic_number"
    WHERE vm."epic_number" IS NULL
  ) THEN
    RAISE NOTICE 'Warning: Found orphaned PhoneUpdateHistory records';
  END IF;
END $$;

DO $$ BEGIN
 ALTER TABLE "BeneficiaryService" ADD CONSTRAINT "BeneficiaryService_voter_id_VoterMaster_epic_number_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."VoterMaster"("epic_number") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "PhoneUpdateHistory" ADD CONSTRAINT "PhoneUpdateHistory_epic_number_VoterMaster_epic_number_fk" FOREIGN KEY ("epic_number") REFERENCES "public"."VoterMaster"("epic_number") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "VoterMobileNumber" ADD CONSTRAINT "VoterMobileNumber_epic_number_VoterMaster_epic_number_fk" FOREIGN KEY ("epic_number") REFERENCES "public"."VoterMaster"("epic_number") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "VoterTask" ADD CONSTRAINT "VoterTask_voter_id_VoterMaster_epic_number_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."VoterMaster"("epic_number") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
