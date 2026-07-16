-- ADM year-scoped funds + Project detailing split
-- ADM: funds, allocations, operational docs
-- Project: roster fields, execution, ground media, document repository

-- ─── 1. AdmFundRecord (year-scoped budgets per category) ─────────────────────

CREATE TABLE IF NOT EXISTS "public"."AdmFundRecord" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "category_id" uuid NOT NULL,
  "financial_year" character varying(20) NOT NULL,
  "project_year" character varying(20) NOT NULL,
  "budget" bigint NOT NULL DEFAULT 0,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "AdmFundRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdmFundRecord_category_id_fkey" FOREIGN KEY ("category_id")
    REFERENCES "public"."AdmFundingCategory"("id") ON DELETE CASCADE,
  CONSTRAINT "AdmFundRecord_category_fy_py_key"
    UNIQUE ("category_id", "financial_year", "project_year")
);

CREATE INDEX IF NOT EXISTS "idx_adm_fund_record_category_id"
  ON "public"."AdmFundRecord" ("category_id");

-- Seed fund records only where needed to migrate existing AdmWork allocations.
-- Categories without works start empty; users create funds via the ADM UI.
INSERT INTO "public"."AdmFundRecord" (
  "category_id", "financial_year", "project_year", "budget"
)
SELECT
  c."id",
  '2025-26',
  '2025-26',
  c."master_budget"
FROM "public"."AdmFundingCategory" c
WHERE EXISTS (
  SELECT 1 FROM "public"."AdmWork" w
  WHERE w."category_id" = c."id" AND w."project_id" IS NOT NULL
)
AND NOT EXISTS (
  SELECT 1 FROM "public"."AdmFundRecord" f
  WHERE f."category_id" = c."id"
    AND f."financial_year" = '2025-26'
    AND f."project_year" = '2025-26'
);

ALTER TABLE "public"."AdmFundingCategory"
  DROP COLUMN IF EXISTS "master_budget";

-- ─── 2. Extend MlaProject with roster + execution fields ─────────────────────

ALTER TABLE "public"."MlaProject"
  ADD COLUMN IF NOT EXISTS "department" character varying(255),
  ADD COLUMN IF NOT EXISTS "category" character varying(255),
  ADD COLUMN IF NOT EXISTS "estimated_cost" bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "approval_status" character varying(20) NOT NULL DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS "noc_required" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "noc_status" character varying(20) NOT NULL DEFAULT 'NotRequired',
  ADD COLUMN IF NOT EXISTS "remarks" text,
  ADD COLUMN IF NOT EXISTS "physical_status" character varying(10) NOT NULL DEFAULT 'WNS',
  ADD COLUMN IF NOT EXISTS "bhoomi_pujan_done" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "bhoomi_pujan_date" date,
  ADD COLUMN IF NOT EXISTS "lokarpan_done" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lokarpan_date" date;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MlaProject_approval_status_check'
  ) THEN
    ALTER TABLE "public"."MlaProject"
      ADD CONSTRAINT "MlaProject_approval_status_check"
      CHECK ("approval_status" IN ('Pending', 'Approved', 'Rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MlaProject_noc_status_check'
  ) THEN
    ALTER TABLE "public"."MlaProject"
      ADD CONSTRAINT "MlaProject_noc_status_check"
      CHECK ("noc_status" IN ('NotRequired', 'Pending', 'Obtained', 'Rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MlaProject_physical_status_check'
  ) THEN
    ALTER TABLE "public"."MlaProject"
      ADD CONSTRAINT "MlaProject_physical_status_check"
      CHECK ("physical_status" IN ('WNS', 'WIP', 'WC'));
  END IF;
END $$;

-- Backfill orphan AdmWork rows into MlaProject, then copy execution fields
DO $$
DECLARE
  work_row RECORD;
  new_project_id uuid;
  system_user_id uuid;
BEGIN
  SELECT "id" INTO system_user_id FROM "public"."User" LIMIT 1;

  FOR work_row IN
    SELECT * FROM "public"."AdmWork"
  LOOP
    IF work_row.project_id IS NULL THEN
      IF system_user_id IS NULL THEN
        CONTINUE;
      END IF;
      INSERT INTO "public"."MlaProject" (
        "name",
        "status",
        "created_by",
        "physical_status",
        "bhoomi_pujan_done",
        "bhoomi_pujan_date",
        "lokarpan_done",
        "lokarpan_date",
        "estimated_cost"
      ) VALUES (
        work_row.name,
        'In Progress',
        COALESCE(work_row.created_by, system_user_id),
        work_row.physical_status,
        work_row.bhoomi_pujan_done,
        work_row.bhoomi_pujan_date,
        work_row.lokarpan_done,
        work_row.lokarpan_date,
        work_row.work_budget
      )
      RETURNING "id" INTO new_project_id;

      UPDATE "public"."AdmWork"
      SET "project_id" = new_project_id
      WHERE "id" = work_row.id;
    ELSE
      UPDATE "public"."MlaProject" p
      SET
        "physical_status" = work_row.physical_status,
        "bhoomi_pujan_done" = work_row.bhoomi_pujan_done,
        "bhoomi_pujan_date" = work_row.bhoomi_pujan_date,
        "lokarpan_done" = work_row.lokarpan_done,
        "lokarpan_date" = work_row.lokarpan_date,
        "estimated_cost" = CASE
          WHEN p."estimated_cost" = 0 THEN work_row.work_budget
          ELSE p."estimated_cost"
        END,
        "updated_at" = now()
      WHERE p."id" = work_row.project_id;
    END IF;
  END LOOP;
END $$;

-- ─── 3. ProjectGroundMedia (multi before/after) ──────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."ProjectGroundMedia" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL,
  "photo_type" character varying(10) NOT NULL,
  "file_url" text NOT NULL,
  "file_name" character varying(255) NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "ProjectGroundMedia_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectGroundMedia_project_id_fkey" FOREIGN KEY ("project_id")
    REFERENCES "public"."MlaProject"("id") ON DELETE CASCADE,
  CONSTRAINT "ProjectGroundMedia_photo_type_check"
    CHECK ("photo_type" IN ('before', 'after'))
);

CREATE INDEX IF NOT EXISTS "idx_project_ground_media_project_id"
  ON "public"."ProjectGroundMedia" ("project_id");

INSERT INTO "public"."ProjectGroundMedia" (
  "project_id", "photo_type", "file_url", "file_name", "sort_order"
)
SELECT
  w."project_id",
  'before',
  w."before_photo_url",
  COALESCE(w."before_photo_name", 'before.jpg'),
  0
FROM "public"."AdmWork" w
WHERE w."project_id" IS NOT NULL
  AND w."before_photo_url" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "public"."ProjectGroundMedia" m
    WHERE m."project_id" = w."project_id"
      AND m."file_url" = w."before_photo_url"
  );

INSERT INTO "public"."ProjectGroundMedia" (
  "project_id", "photo_type", "file_url", "file_name", "sort_order"
)
SELECT
  w."project_id",
  'after',
  w."after_photo_url",
  COALESCE(w."after_photo_name", 'after.jpg'),
  0
FROM "public"."AdmWork" w
WHERE w."project_id" IS NOT NULL
  AND w."after_photo_url" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "public"."ProjectGroundMedia" m
    WHERE m."project_id" = w."project_id"
      AND m."file_url" = w."after_photo_url"
  );

-- ─── 4. Extend ProjectAttachment (document repository + versioning) ──────────

ALTER TABLE "public"."ProjectAttachment"
  ADD COLUMN IF NOT EXISTS "document_kind" character varying(30) NOT NULL DEFAULT 'supporting',
  ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "version_group_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS "uploaded_by" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProjectAttachment_document_kind_check'
  ) THEN
    ALTER TABLE "public"."ProjectAttachment"
      ADD CONSTRAINT "ProjectAttachment_document_kind_check"
      CHECK ("document_kind" IN (
        'approval_pdf', 'sanction_letter', 'noc', 'supporting'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProjectAttachment_uploaded_by_fkey'
  ) THEN
    ALTER TABLE "public"."ProjectAttachment"
      ADD CONSTRAINT "ProjectAttachment_uploaded_by_fkey"
      FOREIGN KEY ("uploaded_by") REFERENCES "public"."User"("id");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_project_attachment_version_group"
  ON "public"."ProjectAttachment" ("version_group_id");

-- ─── 5. AdmDocument (ADM operational docs on fund records) ───────────────────

CREATE TABLE IF NOT EXISTS "public"."AdmDocument" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "fund_record_id" uuid NOT NULL,
  "file_name" character varying(255) NOT NULL,
  "file_size_kb" integer NOT NULL DEFAULT 0,
  "file_url" text,
  "kind" character varying(100) NOT NULL DEFAULT 'general',
  "label" character varying(255),
  "uploaded_by" uuid NOT NULL,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "AdmDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdmDocument_fund_record_id_fkey" FOREIGN KEY ("fund_record_id")
    REFERENCES "public"."AdmFundRecord"("id") ON DELETE CASCADE,
  CONSTRAINT "AdmDocument_uploaded_by_fkey" FOREIGN KEY ("uploaded_by")
    REFERENCES "public"."User"("id")
);

CREATE INDEX IF NOT EXISTS "idx_adm_document_fund_record_id"
  ON "public"."AdmDocument" ("fund_record_id");

-- ─── 6. AdmFundAllocation (thin fund → project link) ─────────────────────────

CREATE TABLE IF NOT EXISTS "public"."AdmFundAllocation" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "fund_record_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "allocated_budget" bigint NOT NULL DEFAULT 0,
  "created_by" uuid NOT NULL,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "AdmFundAllocation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdmFundAllocation_fund_record_id_fkey" FOREIGN KEY ("fund_record_id")
    REFERENCES "public"."AdmFundRecord"("id") ON DELETE CASCADE,
  CONSTRAINT "AdmFundAllocation_project_id_fkey" FOREIGN KEY ("project_id")
    REFERENCES "public"."MlaProject"("id") ON DELETE CASCADE,
  CONSTRAINT "AdmFundAllocation_fund_project_key"
    UNIQUE ("fund_record_id", "project_id"),
  CONSTRAINT "AdmFundAllocation_created_by_fkey" FOREIGN KEY ("created_by")
    REFERENCES "public"."User"("id")
);

CREATE INDEX IF NOT EXISTS "idx_adm_fund_allocation_fund_record_id"
  ON "public"."AdmFundAllocation" ("fund_record_id");
CREATE INDEX IF NOT EXISTS "idx_adm_fund_allocation_project_id"
  ON "public"."AdmFundAllocation" ("project_id");

-- Migrate AdmWork → AdmFundAllocation using backfilled fund records
INSERT INTO "public"."AdmFundAllocation" (
  "fund_record_id",
  "project_id",
  "allocated_budget",
  "created_by",
  "created_at",
  "updated_at"
)
SELECT
  f."id",
  w."project_id",
  w."work_budget",
  w."created_by",
  w."created_at",
  w."updated_at"
FROM "public"."AdmWork" w
JOIN "public"."AdmFundRecord" f
  ON f."category_id" = w."category_id"
 AND f."financial_year" = '2025-26'
 AND f."project_year" = '2025-26'
WHERE w."project_id" IS NOT NULL
ON CONFLICT ("fund_record_id", "project_id") DO NOTHING;

-- Drop legacy AdmWork table (execution + photos migrated)
DROP TABLE IF EXISTS "public"."AdmWork" CASCADE;

-- Grants for new tables (match existing pattern)
GRANT ALL ON TABLE "public"."AdmFundRecord" TO "anon", "authenticated", "service_role";
GRANT ALL ON TABLE "public"."AdmFundAllocation" TO "anon", "authenticated", "service_role";
GRANT ALL ON TABLE "public"."AdmDocument" TO "anon", "authenticated", "service_role";
GRANT ALL ON TABLE "public"."ProjectGroundMedia" TO "anon", "authenticated", "service_role";
