-- ADM Fund Heads (canonical) from ADM DETAILS sheets + AdmDemandLetter table.
-- Safe to re-run for category upserts; demand-letter table is IF NOT EXISTS.

-- 1) Seed / upsert Fund Head categories
INSERT INTO "public"."AdmFundingCategory" ("code", "name", "display_order")
VALUES
  ('MLA-1', 'MLA-1', 0),
  ('MLA-2', 'MLA-2', 1),
  ('BEAUTIFICATION-1', 'Beautification-1', 2),
  ('BEAUTIFICATION-2', 'Beautification-2', 3),
  ('NDVSY', 'NDVSY', 4),
  ('RETAINING-WALL', 'Retaining Wall', 5),
  ('40-SPECIAL', '40 Special', 6),
  ('MHADA-SPECIAL', 'MHADA Special', 7),
  ('MINORITY', 'Minority', 8),
  ('UD-URBAN-DEV', 'U/D (Urban Development)', 9),
  ('NIYOJAN', 'Niyojan (Planning)', 10),
  ('SAMAJIK-NYAY', 'Samajik Nyay', 11),
  ('TOURISM', 'Tourism', 12),
  ('RETAINING-WALL-1', 'Retaining Wall-1', 13),
  ('RETAINING-WALL-2', 'Retaining Wall-2', 14),
  ('RETAINING-WALL-3', 'Retaining Wall-3', 15)
ON CONFLICT ("code") DO UPDATE
SET
  name = EXCLUDED.name,
  display_order = EXCLUDED.display_order,
  updated_at = now();

-- Legacy categories are left in place (never .cursor/rules/never-drop-db.mdc).

-- 2) Demand letters (standalone ADM section)
CREATE TABLE IF NOT EXISTS "public"."AdmDemandLetter" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "letter_date" date NOT NULL,
  "title" text NOT NULL,
  "file_name" character varying(255) NOT NULL,
  "file_size_kb" integer NOT NULL DEFAULT 0,
  "file_url" text NOT NULL,
  "uploaded_by" uuid NOT NULL,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "AdmDemandLetter_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdmDemandLetter_uploaded_by_fkey" FOREIGN KEY ("uploaded_by")
    REFERENCES "public"."User"("id")
);

CREATE INDEX IF NOT EXISTS "idx_adm_demand_letter_letter_date"
  ON "public"."AdmDemandLetter" ("letter_date" DESC);

CREATE INDEX IF NOT EXISTS "idx_adm_demand_letter_title"
  ON "public"."AdmDemandLetter" ("title");

GRANT ALL ON TABLE "public"."AdmDemandLetter" TO "anon", "authenticated", "service_role";
