-- ADM sanction-order works fields + inward-linked documents
-- Project attachments also require inward register reference

-- ─── 1. Document type: SanctionOrder ─────────────────────────────────────────

INSERT INTO "public"."DocumentTypeMaster" (code, label_en, label_mr, sort_order, is_active)
VALUES (
  'SanctionOrder',
  'Sanction Order',
  'प्रशासकीय मंजुरी आदेश',
  4,
  true
)
ON CONFLICT (code) DO NOTHING;

-- ─── 2. MlaProject location fields ───────────────────────────────────────────

ALTER TABLE "public"."MlaProject"
  ADD COLUMN IF NOT EXISTS "taluka" character varying(255),
  ADD COLUMN IF NOT EXISTS "village" character varying(255);

-- ─── 3. AdmFundAllocation work line-item fields ──────────────────────────────

ALTER TABLE "public"."AdmFundAllocation"
  ADD COLUMN IF NOT EXISTS "work_code" character varying(100),
  ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "mla_recommendation_ref" character varying(255),
  ADD COLUMN IF NOT EXISTS "technical_sanction_ref" character varying(255),
  ADD COLUMN IF NOT EXISTS "technical_sanction_date" date,
  ADD COLUMN IF NOT EXISTS "technical_sanction_amount" bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "government_fixed_amount" bigint NOT NULL DEFAULT 0;

-- ─── 4. AdmDocument → inward RegisterEntry ───────────────────────────────────

ALTER TABLE "public"."AdmDocument"
  ADD COLUMN IF NOT EXISTS "register_entry_id" uuid,
  ADD COLUMN IF NOT EXISTS "amount_unit" character varying(20) NOT NULL DEFAULT 'rupees';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AdmDocument_amount_unit_check'
  ) THEN
    ALTER TABLE "public"."AdmDocument"
      ADD CONSTRAINT "AdmDocument_amount_unit_check"
      CHECK ("amount_unit" IN ('rupees', 'thousands', 'lakhs'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AdmDocument_register_entry_id_fkey'
  ) THEN
    ALTER TABLE "public"."AdmDocument"
      ADD CONSTRAINT "AdmDocument_register_entry_id_fkey"
      FOREIGN KEY ("register_entry_id")
      REFERENCES "public"."RegisterEntry"("id")
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_adm_document_register_entry_id"
  ON "public"."AdmDocument" ("register_entry_id");

ALTER TABLE "public"."AdmDocument"
  ALTER COLUMN "file_name" DROP NOT NULL;

ALTER TABLE "public"."AdmDocument"
  ALTER COLUMN "kind" SET DEFAULT 'sanction_order';

-- ─── 5. ProjectAttachment → inward RegisterEntry ─────────────────────────────

ALTER TABLE "public"."ProjectAttachment"
  ADD COLUMN IF NOT EXISTS "register_entry_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProjectAttachment_register_entry_id_fkey'
  ) THEN
    ALTER TABLE "public"."ProjectAttachment"
      ADD CONSTRAINT "ProjectAttachment_register_entry_id_fkey"
      FOREIGN KEY ("register_entry_id")
      REFERENCES "public"."RegisterEntry"("id")
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_project_attachment_register_entry_id"
  ON "public"."ProjectAttachment" ("register_entry_id");

ALTER TABLE "public"."ProjectAttachment"
  ALTER COLUMN "file_name" DROP NOT NULL;
