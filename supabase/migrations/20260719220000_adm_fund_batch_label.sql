-- Allow multiple MLA fund batches per financial year (e.g. MLA-1 / MLA-2)

ALTER TABLE "public"."AdmFundRecord"
  ADD COLUMN IF NOT EXISTS "batch_label" character varying(50) NOT NULL DEFAULT '';

-- Backfill any nulls (IF NOT EXISTS path on older DBs)
UPDATE "public"."AdmFundRecord"
SET "batch_label" = ''
WHERE "batch_label" IS NULL;

ALTER TABLE "public"."AdmFundRecord"
  DROP CONSTRAINT IF EXISTS "AdmFundRecord_category_fy_py_key";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AdmFundRecord_category_fy_batch_key'
  ) THEN
    ALTER TABLE "public"."AdmFundRecord"
      ADD CONSTRAINT "AdmFundRecord_category_fy_batch_key"
      UNIQUE ("category_id", "financial_year", "batch_label");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_adm_fund_record_batch_label"
  ON "public"."AdmFundRecord" ("batch_label");
