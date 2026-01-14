DROP INDEX IF EXISTS "idx_election_mapping_constituency_id";--> statement-breakpoint
ALTER TABLE "ElectionMaster" ADD COLUMN "constituency_type" varchar;--> statement-breakpoint
ALTER TABLE "ElectionMaster" ADD COLUMN "constituency_id" varchar(50);--> statement-breakpoint
ALTER TABLE "ElectionMapping" DROP COLUMN IF EXISTS "constituency_type";--> statement-breakpoint
ALTER TABLE "ElectionMapping" DROP COLUMN IF EXISTS "constituency_id";