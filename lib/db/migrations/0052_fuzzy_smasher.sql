ALTER TABLE "VoterMaster" ADD COLUMN IF NOT EXISTS "locality_street" varchar(255);--> statement-breakpoint
ALTER TABLE "VoterMaster" ADD COLUMN IF NOT EXISTS "town_village" varchar(255);