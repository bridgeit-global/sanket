-- Drop unused BoothMaster columns
DROP INDEX IF EXISTS "idx_booth_master_constituency_id";--> statement-breakpoint
ALTER TABLE "BoothMaster" DROP COLUMN IF EXISTS "ac_no";--> statement-breakpoint
ALTER TABLE "BoothMaster" DROP COLUMN IF EXISTS "ward_no";--> statement-breakpoint
ALTER TABLE "BoothMaster" DROP COLUMN IF EXISTS "constituency_type";--> statement-breakpoint
ALTER TABLE "BoothMaster" DROP COLUMN IF EXISTS "constituency_id";
