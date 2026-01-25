-- Create VoterProfile table for extended profiling data
CREATE TABLE IF NOT EXISTS "VoterProfile" (
	"epic_number" varchar(20) PRIMARY KEY NOT NULL,
	"education" varchar(100),
	"occupation_type" varchar CHECK ("occupation_type" IN ('business', 'service')),
	"occupation_detail" varchar(255),
	"region" varchar(100),
	"is_our_supporter" boolean,
	"influencer_type" varchar CHECK ("influencer_type" IN ('political', 'local', 'education', 'religious')),
	"vehicle_type" varchar CHECK ("vehicle_type" IN ('2w', '4w', 'both')),
	"is_profiled" boolean DEFAULT false NOT NULL,
	"profiled_at" timestamp,
	"profiled_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Create UserPartAssignment table for mapping users to part numbers
CREATE TABLE IF NOT EXISTS "UserPartAssignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"election_id" varchar(50) NOT NULL,
	"booth_no" varchar(10) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "VoterProfile" ADD CONSTRAINT "VoterProfile_epic_number_VoterMaster_epic_number_fk" FOREIGN KEY ("epic_number") REFERENCES "public"."VoterMaster"("epic_number") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "VoterProfile" ADD CONSTRAINT "VoterProfile_profiled_by_User_id_fk" FOREIGN KEY ("profiled_by") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserPartAssignment" ADD CONSTRAINT "UserPartAssignment_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserPartAssignment" ADD CONSTRAINT "UserPartAssignment_election_id_ElectionMaster_election_id_fk" FOREIGN KEY ("election_id") REFERENCES "public"."ElectionMaster"("election_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
-- Add unique constraint for UserPartAssignment
ALTER TABLE "UserPartAssignment" ADD CONSTRAINT "UserPartAssignment_user_id_election_id_booth_no_unique" UNIQUE("user_id","election_id","booth_no");
--> statement-breakpoint
-- Add indexes for UserPartAssignment
CREATE INDEX IF NOT EXISTS "idx_user_part_assignment_user_id" ON "UserPartAssignment" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_part_assignment_election_id" ON "UserPartAssignment" USING btree ("election_id");