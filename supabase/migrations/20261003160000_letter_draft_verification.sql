-- Draft / verification status for saved letters.
-- Existing rows were final saves, so they stay approved and printable.

ALTER TABLE "public"."Letter"
  ADD COLUMN IF NOT EXISTS "status" text;

UPDATE "public"."Letter"
SET "status" = 'approved'
WHERE "status" IS NULL;

ALTER TABLE "public"."Letter"
  ALTER COLUMN "status" SET DEFAULT 'draft';

ALTER TABLE "public"."Letter"
  ALTER COLUMN "status" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'letter_status_check'
  ) THEN
    ALTER TABLE "public"."Letter"
      ADD CONSTRAINT "letter_status_check"
      CHECK ("status" IN ('draft', 'pending_verification', 'approved'));
  END IF;
END $$;

ALTER TABLE "public"."Letter"
  ADD COLUMN IF NOT EXISTS "submitted_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "approved_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "approved_by" uuid REFERENCES "public"."User"(id) ON DELETE SET NULL;

COMMENT ON COLUMN "public"."Letter"."status" IS
  'draft: editable; pending_verification: sent to admin; approved: final.';
