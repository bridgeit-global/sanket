-- Government Follow-up Desk: matters pending with government authorities.

CREATE TABLE IF NOT EXISTS "public"."GovFollowUpDepartment" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "code" character varying(40) NOT NULL,
  "name" character varying(255) NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "GovFollowUpDepartment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GovFollowUpDepartment_code_key" UNIQUE ("code")
);

CREATE TABLE IF NOT EXISTS "public"."GovFollowUpLocation" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "code" character varying(40) NOT NULL,
  "name" character varying(255) NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "GovFollowUpLocation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GovFollowUpLocation_code_key" UNIQUE ("code")
);

CREATE TABLE IF NOT EXISTS "public"."GovFollowUpSequence" (
  "year" integer NOT NULL,
  "last_number" integer NOT NULL DEFAULT 0,
  "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "GovFollowUpSequence_pkey" PRIMARY KEY ("year")
);

CREATE TABLE IF NOT EXISTS "public"."GovFollowUpMatter" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "follow_up_no" character varying(20) NOT NULL,
  "subject" character varying(500) NOT NULL,
  "letter_id" uuid,
  "register_entry_id" uuid,
  "beneficiary_service_id" uuid,
  "project_id" uuid,
  "department_id" uuid NOT NULL,
  "location_id" uuid NOT NULL,
  "office_name" character varying(255),
  "officer_name" character varying(255),
  "designation" character varying(255),
  "contact_phone" character varying(40),
  "contact_email" character varying(255),
  "desk_name" character varying(255),
  "present_stage" character varying(500),
  "staff_user_id" uuid,
  "date_submitted" date NOT NULL,
  "inward_ref_no" character varying(100),
  "last_follow_up_on" date,
  "last_follow_up_mode" character varying(20),
  "last_response" text,
  "next_action" character varying(500),
  "next_follow_up_on" date,
  "last_log_kind" character varying(30),
  "priority" character varying(20) NOT NULL DEFAULT 'normal',
  "status" character varying(30) NOT NULL DEFAULT 'pending',
  "remarks" text,
  "created_by" uuid NOT NULL,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "GovFollowUpMatter_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GovFollowUpMatter_follow_up_no_key" UNIQUE ("follow_up_no"),
  CONSTRAINT "GovFollowUpMatter_department_id_fkey"
    FOREIGN KEY ("department_id") REFERENCES "public"."GovFollowUpDepartment"("id"),
  CONSTRAINT "GovFollowUpMatter_location_id_fkey"
    FOREIGN KEY ("location_id") REFERENCES "public"."GovFollowUpLocation"("id"),
  CONSTRAINT "GovFollowUpMatter_letter_id_fkey"
    FOREIGN KEY ("letter_id") REFERENCES "public"."Letter"("id") ON DELETE SET NULL,
  CONSTRAINT "GovFollowUpMatter_register_entry_id_fkey"
    FOREIGN KEY ("register_entry_id") REFERENCES "public"."RegisterEntry"("id") ON DELETE SET NULL,
  CONSTRAINT "GovFollowUpMatter_beneficiary_service_id_fkey"
    FOREIGN KEY ("beneficiary_service_id") REFERENCES "public"."BeneficiaryService"("id") ON DELETE SET NULL,
  CONSTRAINT "GovFollowUpMatter_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "public"."MlaProject"("id") ON DELETE SET NULL,
  CONSTRAINT "GovFollowUpMatter_staff_user_id_fkey"
    FOREIGN KEY ("staff_user_id") REFERENCES "public"."User"("id") ON DELETE SET NULL,
  CONSTRAINT "GovFollowUpMatter_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "public"."User"("id"),
  CONSTRAINT "GovFollowUpMatter_priority_check"
    CHECK ("priority" IN ('urgent', 'high', 'normal')),
  CONSTRAINT "GovFollowUpMatter_status_check"
    CHECK ("status" IN (
      'pending',
      'under_process',
      'approval_pending',
      'sanctioned',
      'rejected',
      'closed'
    )),
  CONSTRAINT "GovFollowUpMatter_open_next_date_check"
    CHECK (
      (
        "status" IN ('pending', 'under_process', 'approval_pending')
        AND "next_follow_up_on" IS NOT NULL
      )
      OR "status" IN ('sanctioned', 'rejected', 'closed')
    )
);

CREATE TABLE IF NOT EXISTS "public"."GovFollowUpLog" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "matter_id" uuid NOT NULL,
  "occurred_on" date NOT NULL,
  "kind" character varying(30) NOT NULL,
  "mode" character varying(20),
  "body" text NOT NULL,
  "department_id" uuid,
  "location_id" uuid,
  "office_name" character varying(255),
  "officer_name" character varying(255),
  "designation" character varying(255),
  "desk_name" character varying(255),
  "present_stage" character varying(500),
  "next_follow_up_on" date,
  "next_action" character varying(500),
  "performed_by" uuid NOT NULL,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "GovFollowUpLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GovFollowUpLog_matter_id_fkey"
    FOREIGN KEY ("matter_id") REFERENCES "public"."GovFollowUpMatter"("id") ON DELETE CASCADE,
  CONSTRAINT "GovFollowUpLog_department_id_fkey"
    FOREIGN KEY ("department_id") REFERENCES "public"."GovFollowUpDepartment"("id") ON DELETE SET NULL,
  CONSTRAINT "GovFollowUpLog_location_id_fkey"
    FOREIGN KEY ("location_id") REFERENCES "public"."GovFollowUpLocation"("id") ON DELETE SET NULL,
  CONSTRAINT "GovFollowUpLog_performed_by_fkey"
    FOREIGN KEY ("performed_by") REFERENCES "public"."User"("id"),
  CONSTRAINT "GovFollowUpLog_kind_check"
    CHECK ("kind" IN (
      'submitted',
      'inward',
      'follow_up',
      'file_movement',
      'query',
      'compliance',
      'order',
      'closed',
      'note'
    )),
  CONSTRAINT "GovFollowUpLog_mode_check"
    CHECK (
      "mode" IS NULL
      OR "mode" IN ('call', 'visit', 'whatsapp', 'email', 'letter', 'meeting')
    )
);

CREATE INDEX IF NOT EXISTS "idx_gov_follow_up_matter_next_on"
  ON "public"."GovFollowUpMatter" ("next_follow_up_on");
CREATE INDEX IF NOT EXISTS "idx_gov_follow_up_matter_status"
  ON "public"."GovFollowUpMatter" ("status");
CREATE INDEX IF NOT EXISTS "idx_gov_follow_up_matter_department"
  ON "public"."GovFollowUpMatter" ("department_id");
CREATE INDEX IF NOT EXISTS "idx_gov_follow_up_matter_location"
  ON "public"."GovFollowUpMatter" ("location_id");
CREATE INDEX IF NOT EXISTS "idx_gov_follow_up_matter_staff"
  ON "public"."GovFollowUpMatter" ("staff_user_id");
CREATE INDEX IF NOT EXISTS "idx_gov_follow_up_matter_officer"
  ON "public"."GovFollowUpMatter" ("officer_name");
CREATE INDEX IF NOT EXISTS "idx_gov_follow_up_matter_letter"
  ON "public"."GovFollowUpMatter" ("letter_id");
CREATE INDEX IF NOT EXISTS "idx_gov_follow_up_matter_register"
  ON "public"."GovFollowUpMatter" ("register_entry_id");
CREATE INDEX IF NOT EXISTS "idx_gov_follow_up_log_matter_occurred"
  ON "public"."GovFollowUpLog" ("matter_id", "occurred_on", "created_at");

CREATE OR REPLACE FUNCTION public.next_gov_follow_up_no()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  y integer;
  n integer;
BEGIN
  y := (EXTRACT(YEAR FROM (timezone('Asia/Kolkata', now()))))::integer;
  INSERT INTO public."GovFollowUpSequence" ("year", "last_number", "updated_at")
  VALUES (y, 1, now())
  ON CONFLICT ("year") DO UPDATE
    SET "last_number" = public."GovFollowUpSequence"."last_number" + 1,
        "updated_at" = now()
  RETURNING "last_number" INTO n;
  RETURN 'GF-' || y::text || '-' || lpad(n::text, 4, '0');
END;
$$;

INSERT INTO "public"."GovFollowUpDepartment" ("code", "name", "sort_order")
VALUES
  ('bmc', 'BMC', 10),
  ('sra', 'SRA', 20),
  ('mhada', 'MHADA', 30),
  ('collector', 'Collector', 40),
  ('police', 'Police', 50),
  ('pwd', 'PWD', 60),
  ('home', 'Home Department', 70),
  ('minority', 'Minority Development', 80),
  ('udd', 'Urban Development', 90),
  ('social-justice', 'Social Justice', 100),
  ('planning', 'Planning Department', 110),
  ('mantralaya', 'Mantralaya', 120),
  ('other', 'Other', 999)
ON CONFLICT ("code") DO UPDATE
SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, updated_at = now();

INSERT INTO "public"."GovFollowUpLocation" ("code", "name", "sort_order")
VALUES
  ('mantralaya', 'Mantralaya', 10),
  ('bmc-hq', 'BMC HQ', 20),
  ('bmc-ward', 'BMC Ward', 30),
  ('sra', 'SRA', 40),
  ('mhada', 'MHADA', 50),
  ('collectorate', 'Collectorate', 60),
  ('police-hq', 'Police HQ', 70),
  ('pwd', 'PWD', 80),
  ('other', 'Other', 999)
ON CONFLICT ("code") DO UPDATE
SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, updated_at = now();

INSERT INTO "RoleModulePermissions" ("role_id", "module_key", "has_access", "created_at", "updated_at")
SELECT r.id, 'gov-follow-up', true, now(), now()
FROM "Role" r
WHERE r.name IN ('admin', 'operator', 'back-office')
ON CONFLICT ("role_id", "module_key") DO UPDATE
SET "has_access" = true, "updated_at" = now();
