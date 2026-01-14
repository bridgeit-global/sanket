-- Remove timestamps from ElectionMapping
ALTER TABLE "ElectionMapping" DROP COLUMN IF EXISTS "created_at";--> statement-breakpoint
ALTER TABLE "ElectionMapping" DROP COLUMN IF EXISTS "updated_at";--> statement-breakpoint

-- Rename election id from LS2024 to 172LS2024 while preserving FK integrity
INSERT INTO "ElectionMaster" ("election_id", "election_type", "year", "delimitation_version", "data_source", "constituency_type", "constituency_id", "created_at", "updated_at")
SELECT '172LS2024', "election_type", "year", "delimitation_version", "data_source", "constituency_type", "constituency_id", "created_at", "updated_at"
FROM "ElectionMaster"
WHERE "election_id" = 'LS2024'
  AND NOT EXISTS (
    SELECT 1 FROM "ElectionMaster" WHERE "election_id" = '172LS2024'
  );--> statement-breakpoint
UPDATE "BoothMaster" SET "election_id" = '172LS2024' WHERE "election_id" = 'LS2024';--> statement-breakpoint
UPDATE "ElectionMapping" SET "election_id" = '172LS2024' WHERE "election_id" = 'LS2024';--> statement-breakpoint
DELETE FROM "ElectionMaster" WHERE "election_id" = 'LS2024';
