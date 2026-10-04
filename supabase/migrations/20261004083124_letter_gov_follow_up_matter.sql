-- Link generated letters to a gov follow-up matter so multiple letters can
-- belong to the same matter (mirrors Letter.beneficiary_service_id).
ALTER TABLE "public"."Letter"
  ADD COLUMN IF NOT EXISTS "gov_follow_up_matter_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Letter_gov_follow_up_matter_id_fkey'
  ) THEN
    ALTER TABLE "public"."Letter"
      ADD CONSTRAINT "Letter_gov_follow_up_matter_id_fkey"
      FOREIGN KEY ("gov_follow_up_matter_id")
      REFERENCES "public"."GovFollowUpMatter"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_letter_gov_follow_up_matter_id"
  ON "public"."Letter" ("gov_follow_up_matter_id");

-- Backfill from the matter's current letter_id (latest linked letter).
UPDATE "public"."Letter" AS l
SET "gov_follow_up_matter_id" = m."id"
FROM "public"."GovFollowUpMatter" AS m
WHERE m."letter_id" = l."id"
  AND l."gov_follow_up_matter_id" IS NULL;
