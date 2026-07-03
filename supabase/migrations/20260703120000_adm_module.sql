-- ADM (Asset Development & Fund Management) module tables

CREATE TABLE IF NOT EXISTS "public"."AdmFundingCategory" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "code" character varying(20) NOT NULL,
  "name" character varying(255) NOT NULL,
  "master_budget" bigint NOT NULL DEFAULT 0,
  "display_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "AdmFundingCategory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdmFundingCategory_code_key" UNIQUE ("code")
);

CREATE TABLE IF NOT EXISTS "public"."AdmWork" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "category_id" uuid NOT NULL,
  "project_id" uuid,
  "name" character varying(500) NOT NULL,
  "work_budget" bigint NOT NULL DEFAULT 0,
  "physical_status" character varying(10) NOT NULL DEFAULT 'WNS',
  "bhoomi_pujan_done" boolean NOT NULL DEFAULT false,
  "bhoomi_pujan_date" date,
  "lokarpan_done" boolean NOT NULL DEFAULT false,
  "lokarpan_date" date,
  "before_photo_url" text,
  "before_photo_name" character varying(255),
  "after_photo_url" text,
  "after_photo_name" character varying(255),
  "created_by" uuid NOT NULL,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "AdmWork_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdmWork_category_id_fkey" FOREIGN KEY ("category_id")
    REFERENCES "public"."AdmFundingCategory"("id") ON DELETE CASCADE,
  CONSTRAINT "AdmWork_project_id_fkey" FOREIGN KEY ("project_id")
    REFERENCES "public"."MlaProject"("id") ON DELETE SET NULL,
  CONSTRAINT "AdmWork_created_by_fkey" FOREIGN KEY ("created_by")
    REFERENCES "public"."User"("id"),
  CONSTRAINT "AdmWork_physical_status_check" CHECK (
    "physical_status" IN ('WNS', 'WIP', 'WC')
  )
);

CREATE INDEX IF NOT EXISTS "idx_adm_work_category_id" ON "public"."AdmWork" ("category_id");
CREATE INDEX IF NOT EXISTS "idx_adm_work_project_id" ON "public"."AdmWork" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_adm_funding_category_display_order"
  ON "public"."AdmFundingCategory" ("display_order");

-- Seed 10 funding categories from ADM spec
INSERT INTO "public"."AdmFundingCategory" ("code", "name", "master_budget", "display_order")
VALUES
  ('MLA-FUND', 'MLA Fund', 50000000, 1),
  ('DPDC-BMC', 'DPDC - BMC', 30000000, 2),
  ('DPDC-BEAUT', 'DPDC - Beautification', 15000000, 3),
  ('DPDC-NDSI', 'DPDC - NDSI', 20000000, 4),
  ('DPDC-WALL', 'DPDC Retaining Wall', 8000000, 5),
  ('SPEC-MIN', 'Special - Minority', 20000000, 6),
  ('SPEC-SNAY', 'Special Samajik Nyay', 12000000, 7),
  ('SPEC-TOUR', 'Special Tourism', 25000000, 8),
  ('SPEC-UD', 'Special UD (Urban Development)', 40000000, 9),
  ('SPEC-PLAN', 'Special Planning', 10000000, 10)
ON CONFLICT ("code") DO NOTHING;

-- Grant adm module to admin role
INSERT INTO "RoleModulePermissions" ("role_id", "module_key", "has_access", "created_at", "updated_at")
SELECT r.id, 'adm', true, now(), now()
FROM "Role" r WHERE r.name = 'admin'
ON CONFLICT ("role_id", "module_key") DO UPDATE SET "has_access" = true, "updated_at" = now();
