-- VoterMobileNumber Table for storing multiple mobile numbers per voter with sort order
-- This table allows up to 5 mobile numbers per voter (epic_number)
-- Data is migrated from existing mobileNoPrimary and mobileNoSecondary columns

CREATE TABLE IF NOT EXISTS "VoterMobileNumber" (
  "epic_number" varchar(20) NOT NULL REFERENCES "Voter"("epic_number") ON DELETE CASCADE,
  "mobile_number" varchar(15) NOT NULL,
  "sort_order" integer NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("epic_number", "mobile_number")
);

-- Unique constraint to ensure one mobile number per sort order per voter
CREATE UNIQUE INDEX IF NOT EXISTS "voter_mobile_number_epic_sort_order_idx" 
  ON "VoterMobileNumber"("epic_number", "sort_order");

-- Check constraint to ensure sort_order is between 1 and 5
ALTER TABLE "VoterMobileNumber" 
  ADD CONSTRAINT "voter_mobile_number_sort_order_check" 
  CHECK ("sort_order" >= 1 AND "sort_order" <= 5);

-- Index for querying mobile numbers by epic_number
CREATE INDEX IF NOT EXISTS "voter_mobile_number_epic_number_idx" 
  ON "VoterMobileNumber"("epic_number");

-- Migrate existing mobileNoPrimary data (sort_order = 1)
INSERT INTO "VoterMobileNumber" ("epic_number", "mobile_number", "sort_order", "created_at", "updated_at")
SELECT 
  "epic_number",
  "mobile_no_primary",
  1,
  "created_at",
  "updated_at"
FROM "Voter"
WHERE "mobile_no_primary" IS NOT NULL AND "mobile_no_primary" != ''
ON CONFLICT ("epic_number", "mobile_number") DO NOTHING;

-- Migrate existing mobileNoSecondary data (sort_order = 2)
INSERT INTO "VoterMobileNumber" ("epic_number", "mobile_number", "sort_order", "created_at", "updated_at")
SELECT 
  "epic_number",
  "mobile_no_secondary",
  2,
  "created_at",
  "updated_at"
FROM "Voter"
WHERE "mobile_no_secondary" IS NOT NULL AND "mobile_no_secondary" != ''
  AND "mobile_no_secondary" != "mobile_no_primary" -- Avoid duplicate if same as primary
ON CONFLICT ("epic_number", "mobile_number") DO NOTHING;

