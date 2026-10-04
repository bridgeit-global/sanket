-- Link register entries (inward/outward letters) to a gov follow-up matter
-- so multiple inward uploads can belong to the same matter.
ALTER TABLE "public"."RegisterEntry"
  ADD COLUMN IF NOT EXISTS "gov_follow_up_matter_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RegisterEntry_gov_follow_up_matter_id_fkey'
  ) THEN
    ALTER TABLE "public"."RegisterEntry"
      ADD CONSTRAINT "RegisterEntry_gov_follow_up_matter_id_fkey"
      FOREIGN KEY ("gov_follow_up_matter_id")
      REFERENCES "public"."GovFollowUpMatter"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_register_entry_gov_follow_up_matter_id"
  ON "public"."RegisterEntry" ("gov_follow_up_matter_id");

-- Backfill from the matter's current register_entry_id.
UPDATE "public"."RegisterEntry" AS re
SET "gov_follow_up_matter_id" = m."id"
FROM "public"."GovFollowUpMatter" AS m
WHERE m."register_entry_id" = re."id"
  AND re."gov_follow_up_matter_id" IS NULL;
